# Deploy no Railway

Crie três serviços no mesmo projeto/ambiente: `Postgres`, `pricit` (backend) e `front` (frontend). Os nomes abaixo correspondem a esses serviços; ajuste as referências se renomeá-los.

## Backend: pricit

- Repositório: `pedro-azevedo3/pricit`, branch `main`.
- Root Directory: `/backend`; use o Dockerfile detectado e deixe Start Command vazio.
- Healthcheck: `/health`.
- Variables:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=8000
UVICORN_HOST=::
AUTH_COOKIE_SECURE=true
CORS_ORIGINS=https://DOMINIO-PUBLICO-DO-FRONT
```

Adicione também `LOG_PUBLIC_KEY_PEM` e `DATA_KEYS_JSON` conforme abaixo. A URL padrão do PostgreSQL é convertida automaticamente para o driver psycopg. As migrações rodam antes do servidor; o banco vazio recebe as tabelas automaticamente. Comece com uma réplica do backend. O login admite 10 requisições/minuto por origem, 60/minuto no total e 2 simultâneas por processo; os contadores são locais e reiniciam com o processo. Como a conexão pode vir do proxy do frontend ou do Railway, várias pessoas podem compartilhar a cota por origem. Ao usar mais workers/réplicas, os limites se multiplicam; para uma cota compartilhada, adote Redis ou limitação na borda. Não configure confiança irrestrita em cabeçalhos de IP encaminhados.

## Frontend: front

- Mesmo repositório e branch.
- Root Directory: `/frontend`; use o Dockerfile e deixe Start Command vazio.
- Variables:

```env
API_URL=http://${{pricit.RAILWAY_PRIVATE_DOMAIN}}:8000
PORT=3000
```

Adicione `LOG_PUBLIC_KEY_PEM`. Gere um domínio público em Settings > Networking com porta 3000 e coloque sua URL HTTPS em `CORS_ORIGINS` do backend, sem barra final. Se usar vários domínios, separe por vírgulas, sem espaços.

`API_URL` é incorporada durante o build do Next.js: faça um novo build/deploy do frontend quando alterar essa variável. A rede privada não precisa estar acessível durante o build; o build somente grava o endereço de destino. Backend e banco não precisam de domínio público.

## Chaves

Na pasta local do projeto, os arquivos já existentes em `.secrets/` podem ser usados. Para uma instalação nova, gere-os com:

```sh
sh scripts/setup-log-keys.sh
python3 scripts/setup-data-keys.py
```

No editor de variáveis do Railway, cole os conteúdos completos:

| Variável | Conteúdo do arquivo local | Serviço |
|---|---|---|
| `LOG_PUBLIC_KEY_PEM` | `.secrets/log-public.pem`, incluindo BEGIN/END e quebras de linha | `front` e `pricit` |
| `DATA_KEYS_JSON` | `.secrets/data-keys.json` | somente `pricit` |

No macOS, copie sem imprimir no terminal:

```sh
pbcopy < .secrets/log-public.pem
```

Cole em `LOG_PUBLIC_KEY_PEM` de ambos os serviços. Depois:

```sh
pbcopy < .secrets/data-keys.json
```

Cole em `DATA_KEYS_JSON` somente no backend. Não envie chaves privadas ao Railway nem ao GitHub. Guarde cópia segura das chaves: perder a chave de dados impede recuperar o conteúdo criptografado do banco. Não gere uma chave nova a cada deploy. Para importar o banco local, use a mesma chave que o criptografou.

As variáveis têm precedência sobre os arquivos. Configuração ausente ou inválida impede a inicialização; não há fallback para logs sem criptografia. O Compose local continua usando seus arquivos em `/run/secrets/`.

## Deploy e primeiro acesso

Salve as variáveis, publique o backend e depois o frontend. O frontend pode iniciar antes, mas chamadas à API só funcionarão com o backend disponível.

Pela CLI Railway, conecte-se ao projeto e abra o container do backend:

```sh
railway login
railway link
railway ssh --service pricit
```

Dentro do container:

```sh
python -m app.create_user seu@email.com
```

Informe e confirme uma senha de ao menos 12 caracteres; entre em `https://DOMINIO/login`. Teste login, cadastro de ingrediente e logout. Cada usuário possui seus próprios ingredientes, receitas e históricos; Google permanece indisponível.

## Diagnóstico

- `Log encryption unavailable; service not started.`: `LOG_PUBLIC_KEY_PEM` ausente/inválida. Use a chave pública RSA de 3072 bits gerada pelo script.
- Mensagens `PRICIT_ENCRYPTED_LOG` são esperadas: o conteúdo está criptografado e fica no campo `message` para preservar os dados na exportação do Railway. Baixe os logs do deploy e utilize `backend/.venv/bin/python scripts/decrypt-logs.py --private-key .secrets/log-private.pem < /caminho/logs.log` no computador local. O decifrador aceita o prefixo de data do Railway e os envelopes antigos. Exportações antigas com linhas vazias não contêm os dados e exigem um novo deploy e uma nova exportação.
- Banco sem tabelas: o backend ainda não concluiu a inicialização/migração. Confira conexão, chave de dados e logs; não crie tabelas manualmente.
- API indisponível: confira `API_URL`, nome do serviço, porta 8000 e faça rebuild do frontend.
- HTTP 403 no login: confira `CORS_ORIGINS` com a origem HTTPS exata usada no navegador.

Referências: https://docs.railway.com/deployments/monorepo, https://docs.railway.com/builds/dockerfiles, https://docs.railway.com/networking/private-networking, https://docs.railway.com/cli/ssh.

## Atualização do isolamento por conta

Publique o backend com a migração `a82f30b4d9e1`. Cada nova gravação usa a conta autenticada. Os registros antigos sem autor ficam preservados e ocultos, sem atribuição automática. Confira a seção de recuperação no README antes de associar qualquer registro antigo a uma pessoa. Recarregue o frontend após o deploy para remover dados antigos já carregados na memória do navegador.
