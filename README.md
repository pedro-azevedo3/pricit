# pricit

Aplicação de precificação de receitas para pequenos produtores de alimentos. Interface em português brasileiro, com biblioteca de ingredientes, receitas e precificação de vendas.

## Executar com Docker

Requisitos: Docker Desktop ou Docker Engine com Compose v2. Na raiz do projeto:

```sh
cp .env.example .env
sh scripts/setup-log-keys.sh
python3 scripts/setup-data-keys.py
docker compose up --build -d
```

- Landing page: http://localhost:3000
- Login: http://localhost:3000/login
- Cadastro com questionário: http://localhost:3000/cadastro
- Sistema: http://localhost:3000/app
- Documentação interativa da API: http://localhost:8000/docs
- Saúde do backend e banco: http://localhost:8000/health

A primeira execução baixa as imagens e compila o frontend. O backend aplica as migrações automaticamente antes de iniciar. O banco começa vazio; cadastre seus próprios ingredientes. Não é necessário instalar Node ou Python no computador para usar o Compose.

```sh
docker compose ps
docker compose logs -f backend frontend
docker compose down
```

O volume `postgres_data` preserva os dados após reiniciar os serviços ou fechar o navegador. `docker compose down -v` apaga esse volume e **todos os dados**. As portas ficam vinculadas apenas ao computador local. O painel e a API exigem autenticação por e-mail e senha. Cada conta acessa somente seus ingredientes, receitas e históricos.

## Fluxo de uso

1. Em **Ingredientes**, informe o nome, a quantidade em g, kg, ml ou unidade e o valor da embalagem. Na tabela, escolha exibir o custo por 1 g, 50 g ou 100 g para ingredientes em g ou kg (padrão: 100 g). Mililitros e unidades mantêm suas medidas; o custo por quilograma continua disponível. O seletor altera somente a apresentação, preservando a precisão dos cálculos das receitas. Pesquise, ordene, edite e arquive pelo menu da tabela.
2. Em **Receitas**, cadastre o rendimento, o tempo de produção e os ingredientes. Acrescente embalagens, despesas operacionais e mão de obra. Os resultados aparecem imediatamente.
3. Defina o lucro desejado sobre custo (markup). O preço praticado é independente do sugerido; deixá-lo vazio faz o sistema utilizar o sugerido.
4. Salve e reabra a receita. Exporte o PDF da versão salva ou abra **Precificar vendas**.
5. Compare custo proporcional com lotes completos. Salve a simulação para exportar o PDF e consultar seus valores históricos.
6. Em **Guia**, estude o valor da sua hora e a mão de obra por lote/unidade. Compare hipóteses de preço e volume vendido, entenda a diferença entre markup e margem e consulte as orientações para preencher **Receitas**. Os campos começam vazios; os exemplos são opcionais. Os estudos não são salvos no banco nem transferidos automaticamente, permanecem ao alternar abas e são descartados ao recarregar ou sair do app.

## Segmentos e perfil do negócio

A aba **Perfil** permite escolher **Culinária e confeitaria**, **Lojas de açaí e sorveterias**, **Barbearias e cabeleireiros**, **Hamburguerias** ou **Padarias**. O perfil é persistido na conta e carregado em qualquer dispositivo, sem usar preferências locais de outra pessoa. O nome do negócio é criptografado no banco.

| Segmento | Biblioteca e fichas | Exemplos de custos |
|---|---|---|
| Culinária/confeitaria | Ingredientes / Receitas | Ingredientes, embalagens, forno e mão de obra |
| Açaí/sorveteria | Ingredientes / Produtos | Bases, complementos, porções, copos e freezer |
| Barbearia/cabeleireiro | Produtos / Serviços | Consumo de produtos, atendimento, energia e uso de máquinas |
| Hamburgueria | Ingredientes / Lanches | Carne, pão, chapa, gás e embalagens |
| Padaria | Ingredientes / Receitas | Rendimento da fornada, insumos, forno e equipamentos |

Todas as fichas podem detalhar **energia, equipamentos e outros custos**. Cada recurso informa nome, categoria, medida (kWh, hora de uso ou unidade/rateio), quantidade usada na ficha inteira e valor por medida. O total é `quantidade × valor por medida`, somado aos demais custos uma única vez, fora do percentual de despesas operacionais. Evite duplicar o mesmo gasto no percentual e no detalhamento. A taxa percentual mantém a base histórica: insumos + embalagens/descartáveis.

Serviços podem ser salvos sem produtos consumidos; para um atendimento, use rendimento 1 e o tempo dedicado a ele. Alimentação continua exigindo pelo menos um ingrediente. O preço, a simulação e o PDF incluem os novos custos; históricos preservam o detalhamento e os valores do momento do salvamento. Ao mudar de segmento, as fichas antigas mantêm seu formato (`recipe` ou `service`) e os dados ficam disponíveis, sem conversão automática ou exclusão.

A migração `d51b7c6a203e` atribui `food` às contas existentes e `recipe` às fichas existentes, com custo adicional zero. **No Railway, publique primeiro o backend e depois o frontend**; o comando de inicialização do backend já executa `alembic upgrade head`. Não crie novas tabelas/colunas manualmente nem gere novas chaves. Consulte [o roteiro de atualização](docs/RAILWAY.md).

## Stack e organização

- `frontend/app/`: Next.js App Router, layout e navegação responsiva.
- `frontend/components/`: formulários e fluxos; `ui/` contém os componentes shadcn/ui com Radix, CVA e Tailwind.
- `frontend/lib/`: tipos, cliente HTTP e prévias com decimal.js.
- `backend/app/main.py`: rotas REST `/api/v1`.
- `backend/app/schemas.py`: contratos Pydantic separados de entrada e saída.
- `backend/app/services.py`: persistência e composição de receitas.
- `backend/app/pricing.py`: regras financeiras puras com Decimal.
- `backend/app/models.py`: entidades SQLAlchemy e integridade referencial.
- `backend/app/pdf.py`: exportação ReportLab em A4, tabelas paginadas e cabeçalho repetido.
- `backend/alembic/`: migrações versionadas do PostgreSQL.
- `backend/tests/`: testes unitários e integração com PostgreSQL.
- `frontend/tests/`: testes Playwright em desktop e celular.

## Decisões de cálculo e persistência

- Valores decimais trafegam como **strings JSON**. Nunca se convertem moedas para `float`/`Number` nos cálculos. JavaScript usa números inteiros apenas para contagens e minutos.
- A API preserva entradas de até seis casas decimais; os campos da interface apresentam duas casas. O cálculo preserva 50 dígitos significativos; a apresentação usa duas casas decimais. A partir de x,x7, o valor exibido sobe para o próximo décimo; abaixo desse limite, aplica-se o arredondamento usual a centavos (HALF_UP). Isso também vale para custos por grama, percentuais, quantidades decimais e PDFs. Contagens inteiras continuam inteiras.
- Despesas operacionais incidem em ingredientes + embalagens. Mão de obra usa minutos ÷ 60. Markup é aplicado sobre o custo unitário; margem é lucro ÷ faturamento.
- Preço zero é válido. Quando o faturamento é zero, a margem é apresentada como 0% para evitar divisão por zero; o prejuízo continua visível.
- A simulação usa o custo unitário não arredondado. Lotes são arredondados para cima; o custo de lotes é lotes × custo total da receita. Sobras não geram faturamento.
- O preço preenchido automaticamente na precificação preserva internamente até seis casas e é exibido com duas casas pelo padrão de apresentação. Pela API, omitir o preço usa o preço sugerido com precisão integral.
- Preços atuais dos ingredientes são consultados a cada leitura da receita. Alterações recalculam as receitas, mas jamais os históricos.
- `RevenueSimulation.recipe_snapshot` armazena a receita completa e os resultados, incluindo lotes, como JSONB com decimais em strings. Esse snapshot é a fonte de leitura e PDF do histórico; as colunas NUMERIC também preservam os indicadores.
- Excluir ingrediente vinculado retorna HTTP 409 e oferece arquivamento. Ingredientes arquivados permanecem em receitas existentes e podem ser reativados. Uma receita nova, inclusive uma duplicação, não aceita ingredientes arquivados.
- Excluir uma receita preserva as simulações: a chave estrangeira usa `ON DELETE SET NULL`. O snapshot mantém nome, composição, rendimento e custos originais.
- Uma receita precisa de ao menos um ingrediente, sem repetições. Quantidades inteiras de produção/venda são limitadas a 1.000.000 por operação e há um limite de 1.000 itens por receita.
- Datas são armazenadas com fuso em UTC. PDFs usam America/Recife e DD/MM/AAAA; a interface apresenta datas no fuso do navegador.
- A quantidade de embalagens começa igual ao rendimento e acompanha mudanças até ser personalizada.
- PDFs de receitas refletem a **versão salva**. PDFs de simulações refletem o snapshot, mesmo depois de alterações ou exclusões da receita.

## Desenvolvimento sem Docker para a aplicação

Mantenha o PostgreSQL no Compose:

```sh
docker compose up -d db
```

Backend (Python 3.12):

```sh
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://izyprice:izyprice_local@localhost:5432/izyprice
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Frontend (Node 22 ou superior), em outro terminal:

```sh
cd frontend
npm ci
npm run dev
```

O Next.js encaminha `/api/*` ao FastAPI. Fora do Docker, o destino padrão é `http://127.0.0.1:8000`; `API_URL` permite mudá-lo durante o build. No Docker, usa `http://backend:8000`.

## Testes

Com os serviços iniciados, execute o backend dentro do container:

```sh
docker compose exec backend python -m pytest -q
```

Ou use o ambiente Python local, com `DATABASE_URL` apontando para o banco migrado:

```sh
cd backend
.venv/bin/python -m pytest -q
```

Os testes de integração executam transações externas com savepoints e rollback, sem manter seus cadastros no banco. Cobrem conversões, custos, markup, margens, lotes, CRUD, atualização de preços, histórico, PDF, validações e arquivamento.

Para o frontend, com aplicação e API disponíveis em localhost:3000:

```sh
cd frontend
npm ci
npx playwright install chromium
npm run typecheck
npm run test:e2e
```

Use `E2E_BASE_URL` para apontar a outro ambiente. O fluxo E2E usa nomes únicos, cadastra ingrediente e receita, verifica cálculo instantâneo, recarrega a página, salva simulação, exporta PDFs, altera preços, confere histórico, arquiva e exclui. Executa em desktop e viewport móvel. **Use um banco de testes**: simulações históricas de teste são preservadas intencionalmente, pois a API não oferece sua exclusão.

```sh
npm run build
npm audit
```

Relatório Playwright: `frontend/playwright-report/index.html`. Capturas e traces de falhas: `frontend/test-results/`.

## Validação desta entrega

- Build de produção do Next.js concluído no host e no Docker.
- TypeScript: verificação sem erros.
- Pytest: 35 testes aprovados contra PostgreSQL, também dentro do container.
- Playwright: fluxo completo aprovado em Chromium desktop e viewport de iPhone 13.
- `npm audit`: nenhuma vulnerabilidade reportada após atualização de PostCSS.
- Compose: frontend disponível e backend/PostgreSQL saudáveis; migrações até `c28d1e9f040a` aplicadas.

Os registros temporários usados na validação inicial foram removidos; a aplicação está pronta para seus próprios cadastros.

## Edição de ingredientes dentro da receita

Novos ingredientes usam gramas (`g`) por padrão. Quantidade da embalagem, rendimento da receita e campos de horas/minutos começam vazios, com exemplos apenas no placeholder; ao editar, os valores salvos continuam preenchidos. Na receita, escolha um item da biblioteca, informe a quantidade usada e a unidade compatível com o cadastro (g/kg, ml ou un) e pressione **Adicionar ingrediente**; apenas selecionar não o inclui. As opções mostram nome, preço e quantidade da embalagem para comparar marcas diferentes. Quantidade e unidade utilizadas continuam editáveis na própria linha. O botão de lápis abre o cadastro do ingrediente para alterar nome, embalagem, unidade e preço sem fechar a receita. Essas alterações são salvas na biblioteca e refletem em todas as receitas vinculadas; os históricos permanecem preservados.

A área anteriormente chamada Simulador agora aparece como **Precificação**, inclusive nos botões, históricos e PDFs. Os endpoints `/simulations` continuam compatíveis.

## Aparência

A interface usa bordô, branco e marrom. O botão de sol/lua no cabeçalho alterna os temas claro e escuro. A preferência é salva no navegador; na primeira visita, o sistema acompanha a preferência de aparência do dispositivo. No computador, o botão junto à logo recolhe o menu lateral para mostrar apenas os ícones, ampliando o conteúdo. Essa preferência também é salva no navegador. PDFs usam a paleta clara para impressão.

## Padrão de arredondamento da exibição

- 5,26 → 5,26; 5,27 / 5,28 / 5,29 → 5,30; 5,97 → 6,00.
- O limite é comparado ao valor original: 5,269 é menor que 5,27 e recebe apenas o arredondamento normal para duas casas (5,27).
- Valores negativos seguem a mesma regra em magnitude, preservando o sinal (−5,27 → −5,30).
- Telas e PDFs usam duas casas para moedas, percentuais e quantidades decimais. Valores pequenos podem aparecer como 0,00, mas continuam contribuindo para os custos com precisão integral.
- A formatação não regrava dados nem arredonda resultados intermediários. Campos em repouso exibem o padrão; ao editar, mantêm o valor visível para preservar o cursor e a seleção do campo. Abrir um cadastro sem alterar o campo preserva o valor original salvo.
- Totais são calculados a partir dos valores originais, e não pela soma dos números arredondados exibidos.

## Telas de acesso

A rota `/login` permite entrar com e-mail e senha. O botão Google permanece indisponível e não cria sessões. O cadastro público em `/cadastro` começa com um questionário obrigatório (nome, segmento e objetivo), seguido de e-mail e senha de 12 a 256 caracteres com confirmação. Conta e perfil são criados atomicamente; o primeiro acesso já abre a perspectiva escolhida. A senha é armazenada como hash scrypt. Também continua disponível a criação administrativa pelo terminal.

Depois de atualizar os serviços com `docker compose up --build -d`, crie uma conta pelo site ou, para criação administrativa, execute:

```sh
docker compose exec backend python -m app.create_user voce@exemplo.com
```

O comando solicita a senha e a confirmação sem exibir o que você digita. Use entre 12 e 256 caracteres. Ele normaliza o e-mail, grava o usuário na tabela `users` e armazena apenas o hash scrypt da senha. E-mails duplicados são recusados. Fora do Docker, execute `python -m app.create_user voce@exemplo.com` na pasta `backend`, com `DATABASE_URL` configurada e as migrações aplicadas.

Entre em http://localhost:3000/login. A rota `/app` valida a sessão no servidor a cada solicitação, antes de renderizar o painel; sessões ausentes, inválidas, expiradas ou revogadas redirecionam para `/login`. A API também exige sessão válida em todas as rotas de negócio. A sessão dura sete dias, usa cookie HttpOnly/SameSite e é revogada ao clicar em **Sair**. Após cinco tentativas incorretas, a conta fica bloqueada por 15 minutos. Definir `users.is_active = false` bloqueia a conta e suas sessões imediatamente.

Login e cadastro público compartilham controle de entrada antes de ler o corpo, consultar o banco ou calcular o hash: até **10 requisições por origem em uma janela móvel de 60 segundos**, **60 no total por minuto** e **2 requisições simultâneas**, por processo do backend. Tentativas com e-mails inexistentes, senhas válidas e corpos inválidos também entram na cota. O excesso recebe HTTP 429 com `Retry-After` e não fica em fila. Contas já bloqueadas são rejeitadas antes de calcular a senha.

A origem é o endereço de conexão recebido pelo servidor; cabeçalhos arbitrários `X-Forwarded-For` e `X-Real-IP` não alteram a cota. Atrás de proxies, usuários podem compartilhar a mesma origem e, portanto, a mesma cota de 10/minuto. Os contadores têm memória limitada e expiram após a janela; reiniciar o processo os zera. Para limites compartilhados entre múltiplos workers ou réplicas, use um armazenamento central (como Redis) ou um limitador na borda. O bloqueio de conta de 15 minutos continua persistido no PostgreSQL.


Cada conta acessa exclusivamente seu perfil, insumos, fichas, históricos e PDFs. O proprietário é definido pela sessão, nunca por campos enviados pelo navegador. Não existe usuário ou senha padrão. Registros anteriores à migração de isolamento, sem proprietário conhecido, ficam preservados e ocultos até revisão administrativa.

Para implantação com HTTPS, configure `AUTH_COOKIE_SECURE=true` e inclua a origem exata do frontend em `CORS_ORIGINS` (lista separada por vírgulas). Em desenvolvimento, localhost e 127.0.0.1 na porta 3000 são permitidos por padrão. A tabela `users` mantém o e-mail em texto para identificação, mas nunca a senha; a tabela `user_sessions` mantém somente o hash dos tokens.

Os testes de domínio do backend usam uma dependência autenticada de teste; `test_auth.py` exercita a autenticação real. O teste E2E de cadastro real usa `E2E_SIGNUP_PREFIX` (um prefixo único de execução) e cria os e-mails `<prefixo>-desktop@example.test` e `<prefixo>-mobile@example.test`; remova essas contas e seus registros no banco de testes ao terminar. Para os testes E2E autenticados, forneça `E2E_STORAGE_STATE` com o caminho de um estado Playwright autenticado de uma conta no banco de testes.

## Privacidade e integração Google

Consulte [proteção de logs, banco e backups](docs/PRIVACIDADE.md) para chaves, backup, restauração e limites. Consulte [integração Google](docs/GOOGLE_LOGIN.md) para configurar o projeto no Google Cloud e conhecer as etapas restantes de autenticação e autorização.

## Deploy no Railway

Consulte [o passo a passo do Railway](docs/RAILWAY.md) para configurar os três serviços, as variáveis, as chaves e o primeiro usuário.

## Ingredientes por massa, volume e unidade

- `g` e `kg` pertencem à mesma medida: 1 kg = 1.000 g. O sistema calcula custo por grama e quilograma. Na tabela da biblioteca, ingredientes cadastrados em `g` apresentam o custo a cada 100 g, calculado antes do arredondamento de exibição. Essa apresentação não altera os cálculos das receitas nem as outras medidas.
- `ml` calcula custo por mililitro, sem conversão automática para gramas.
- `un` calcula custo por unidade. Exemplo: 12 ovos por R$ 18,00 custam R$ 1,50 cada; usar 2 ovos custa R$ 3,00. Quantidades fracionadas são permitidas, como meio ovo.
- Uma receita pode combinar todas essas medidas. O seletor oferece apenas unidades compatíveis com cada ingrediente, e a API recusa combinações incompatíveis.
- Ingredientes já vinculados a receitas não podem trocar entre massa, volume e unidade; a API retorna 409 para preservar o significado das quantidades. Alterações g ↔ kg continuam permitidas. O editor dentro da receita preserva a mesma medida do ingrediente.
- A API fornece `base_unit` e `cost_per_base_unit`. Os campos legados `cost_per_gram` e `cost_per_kg` continuam disponíveis para g/kg e retornam `null` para ml/un. Snapshots históricos sem os campos novos continuam legíveis e exportáveis.
- Nenhuma migração de dados é necessária: as medidas continuam armazenadas nos campos criptografados existentes. Publique primeiro o backend atualizado e depois o frontend.

Os planos da landing permanecem em breve: 1 mês por R$ 14,90; 6 meses por R$ 79,90 (R$ 13,32/mês); 1 ano por R$ 129,90 (R$ 10,83/mês), com 27% off sobre 12 mensalidades de R$ 14,90. As equivalências mensais são arredondadas para centavos.

## Isolamento por conta e recuperação dos registros antigos

A migração `a82f30b4d9e1` adiciona `owner_id` a ingredientes, receitas e precificações. Novos registros recebem a conta da sessão; consultas, alterações, exclusões, arquivamento, duplicação e PDFs verificam essa conta. Usar o ID de outra conta retorna 404. Uma receita não aceita ingredientes de outra conta. Respostas da API usam `Cache-Control: private, no-store`.

**Registros anteriores não tinham autor registrado. A migração não tenta adivinhar o dono:** mantém os dados e deixa `owner_id = NULL`; eles não aparecem nem podem ser acessados pela API. Não associe tudo ao primeiro usuário ou à primeira pessoa que entrar. Depois de publicar o backend, recarregue o app para descartar a lista antiga que possa estar na memória do navegador.

Para recuperar registros, um administrador com acesso ao banco precisa revisar o conteúdo, a conta destinatária e os vínculos. A criptografia não permite inferir o criador. O comando abaixo só aceita IDs explicitamente selecionados e valida que os vínculos não cruzem contas. Não há endpoint público para reivindicar ou transferir registros.

Crie um JSON de revisão (sem incluir chaves ou senhas):

```json
{
  "ingredients": ["UUID-DO-INGREDIENTE"],
  "recipes": ["UUID-DA-RECEITA"],
  "simulations": ["UUID-DO-HISTORICO"]
}
```

Na pasta backend (ou dentro de seu container), valide antes de aplicar:

```sh
python -m app.assign_legacy pessoa@exemplo.com revisao.json
python -m app.assign_legacy pessoa@exemplo.com revisao.json --apply
```

Sem `--apply`, nada é alterado. A aplicação é transacional; IDs inexistentes, registros de outra conta e vínculos inconsistentes impedem a atribuição. Ingredientes legados e suas receitas vinculadas precisam ser revisados juntos. Históricos sem receita vinculada exigem revisão explícita de todo o snapshot pelo administrador. Se um ingrediente legado foi reutilizado por pessoas diferentes, revise e separe os dados antes da atribuição; o comando não duplica nem distribui automaticamente esse conteúdo. O acesso ao banco é administrativo e não é limitado pela sessão de um usuário comum.

A prévia pública nas telas de login e cadastro reutiliza o menu, o cabeçalho e a biblioteca de ingredientes do app com exemplos fixos. Ela é inerte e não consulta sessões nem dados de clientes.
