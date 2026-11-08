# Proteção de logs, banco e backups

## Proteção implementada

- Logos dark green no login e cadastro.
- Os processos de frontend e backend são iniciados por um supervisor que captura **stdout e stderr**, inclusive erros e rastros de pilha. Cada bloco recebe uma chave aleatória AES-256-GCM; a chave do bloco é protegida por RSA-OAEP-SHA256 (RSA 3072 bits). Somente o envelope criptografado chega ao logger do Docker. Isso é criptografia autenticada, não apenas Base64.
- Sem chave pública válida, o supervisor não inicia a aplicação. Não há fallback para log em texto aberto. Mensagens fixas de falha de configuração não contêm conteúdo do cliente.
- Logs de acesso do Uvicorn desativados. Não foi criado um histórico de ações dos clientes.
- Os logs criptografados de frontend/backend usam o driver Docker `local`, com rotação de 10 MB e até 3 arquivos por serviço. Horário, serviço, tamanho e frequência das mensagens continuam sendo metadados visíveis.
- PostgreSQL com logger Docker `none`, coletor de logs desligado e sem registro de instruções/parâmetros. Isso reduz a capacidade de diagnóstico direto do banco; saúde e backup continuam verificáveis. WAL é parte do armazenamento transacional e não é um log de console.
- SQLAlchemy com `echo=False` e `hide_parameters=True`.
- Nomes, descrições, unidades, quantidades, preços, custos, percentuais, estado de arquivamento e snapshots são criptografados por campo com AES-256-GCM antes de chegar ao PostgreSQL. O contexto de tabela/coluna e o identificador da chave são autenticados. A precisão decimal é preservada como texto dentro do conteúdo criptografado.
- IDs, chaves estrangeiras, datas, existência de registros, estrutura e tamanhos aproximados permanecem visíveis. Isso não é anonimização nem criptografia ponta a ponta.
- Busca e ordenação dos ingredientes passam a acontecer na aplicação após descriptografar. Não existem índices determinísticos de nomes/preços. Essa escolha exige paginação/arquitetura específica antes de escalar grandes catálogos.
- Regras de unidades e valores são validadas antes da criptografia; o banco não consegue aplicar comparações numéricas a ciphertext. Restrições de integridade referencial, unicidade dos vínculos e obrigatoriedade continuam no banco.
- Backups lógicos são criptografados em fluxo, sem gravar um dump em texto aberto no disco. Cada bloco tem integridade; um manifesto final verifica quantidade, ordem e hash do conteúdo completo. Backup incompleto não é publicado pelo script.

## Chaves

As chaves são geradas localmente, sem serem impressas e sem substituir chaves existentes:

```sh
sh scripts/setup-log-keys.sh
python3 scripts/setup-data-keys.py
```

Arquivos ignorados pelo Git, em `.secrets/`:

| Arquivo | Uso | Onde é montado |
| --- | --- | --- |
| `log-public.pem` | Gravar logs criptografados | frontend/backend |
| `log-private.pem` | Recuperação explícita de logs | nunca nos serviços |
| `backup-public.pem` | Gravar backups criptografados | backend |
| `backup-private.pem` | Restaurar backups | nunca nos serviços |
| `data-keys.json` | Ler/gravar campos do banco | somente backend |

**Guarde cópias de recuperação em um gerenciador de segredos separado dos backups.** Para recuperar um dump após a migração são necessárias tanto a chave privada de backup quanto as chaves de dados correspondentes. Perder essas chaves pode tornar os dados irrecuperáveis. Os segredos privados têm permissão 0600 e o diretório 0700. Docker Compose local usa montagem de arquivos; isso não substitui um KMS/secret manager em produção.

A aplicação precisa acessar a chave de dados para calcular e exibir os valores. Um administrador com controle do backend ou acesso a essa chave ainda pode lê-los. Os serviços não recebem as chaves privadas de logs e backups. Criptografia ponta a ponta impediria o servidor de executar os cálculos atuais e requer outra arquitetura.

## Backups e restauração

Criar um backup:

```sh
bash scripts/backup.sh
```

O arquivo fica em `backups/*.dump.enc` (permissão 0600, ignorado pelo Git). O comando falha se `pg_dump` ou a criptografia falharem. O script usa a base configurada no contêiner, sem colocar a senha na linha de comando.

Para verificar e recuperar **em uma máquina confiável**, instale as dependências no ambiente virtual conforme o README. Escolha um destino temporário que ainda não exista:

```sh
backend/.venv/bin/python scripts/decrypt-backup.py \
  --private-key .secrets/backup-private.pem \
  --input backups/ARQUIVO.dump.enc \
  --output /tmp/pricit-recuperacao.dump
```

A recuperação verifica todo o arquivo antes de publicar o dump com permissão 0600. A restauração PostgreSQL deve primeiro ser feita em **uma base separada**, usando `pg_restore --exit-on-error --no-owner`, com a chave de dados da versão restaurada disponível ao backend. Não restaure sobre a base atual sem conferir o conteúdo, parar as escritas e fazer outro backup. Remova o dump temporário após a operação.

A automatização de horários e retenção depende da hospedagem. Este projeto inclui o comando de backup, mas não configura um agendamento externo. Mantenha cópias fora da máquina do serviço.

## Diagnóstico dos logs

`docker compose logs` agora mostra envelopes criptografados. Saúde dos serviços:

```sh
docker compose ps
curl -fsS http://localhost:8000/health
```

Somente quando necessário e em terminal privado, recuperar registros:

```sh
docker compose logs --no-color --no-log-prefix backend | \
  backend/.venv/bin/python scripts/decrypt-logs.py --private-key .secrets/log-private.pem
```

Esse comando revela conteúdo no terminal por decisão explícita; não redirecione para arquivos públicos, chat ou relatórios. Sem a chave privada os envelopes não são legíveis. Logs históricos exportados anteriormente não são retroativamente criptografados.

## Migração e rotação

A revisão Alembic `e739a2d1b401` converte os registros existentes dentro de uma transação; chaves ausentes impedem o início. Faça backup antes. Ela mantém IDs, datas, vínculos, nulos e precisão. O downgrade automático é bloqueado para impedir retorno acidental a texto aberto; a recuperação usa um backup verificado.

`data-keys.json` suporta um identificador ativo e múltiplas chaves antigas: leituras escolhem a chave indicada em cada campo. Para rotacionar, gerar nova chave aleatória de 32 bytes, adicioná-la ao gerenciador, torná-la ativa e reiniciar o backend. Recriptografar os registros existentes em uma migração planejada antes de retirar a antiga; conservar chaves necessárias aos backups históricos. Não remova uma chave só por mudar a ativa.

## Limites que ainda precisam ser tratados na hospedagem

- **Login Google ainda não existe. O acesso por conta está isolado.** `/app` e a API exigem login por e-mail e senha, com contas criadas pelo administrador. Ingredientes, receitas, históricos e PDFs são limitados à conta da sessão, inclusive acessos por ID e vínculos de ingredientes. Registros antigos sem autor permanecem ocultos até revisão administrativa. E-mails ficam em texto na tabela `users`; senhas e tokens de sessão são armazenados somente como hashes. Criptografia não substitui autenticação e autorização. A configuração e os limites do OAuth futuro continuam descritos em `GOOGLE_LOGIN.md`.
- HTTPS, criptografia do disco/volume e do armazenamento de backups (com KMS), permissões IAM, retenção e backups externos dependem do provedor. O ambiente atual está vinculado ao localhost.
- Dados legados podem existir em páginas antigas do volume, WAL, snapshots ou cópias externas anteriores à migração. A criptografia dos campos atuais não apaga esses vestígios. Para proteção física integral, usar volume/disco criptografado e migrar para armazenamento novo com descarte controlado do antigo.
- O envelope protege conteúdo e detecta adulteração; não impede um administrador do Docker de excluir logs. Não é um sistema de auditoria imutável.
- Processos iniciados manualmente fora dos supervisores, `npm run dev`, `docker exec`, ferramentas de observabilidade e proxies externos precisam seguir a mesma política. Os scripts de backup não registram SQL; testes usam dados sintéticos e banco isolado.

## Fontes

- [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Cryptography: authenticated encryption](https://cryptography.io/en/latest/hazmat/primitives/aead/)
- [Docker: logging drivers](https://docs.docker.com/engine/logging/configure/)
