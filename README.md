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
- Cadastro (tela): http://localhost:3000/cadastro
- Sistema: http://localhost:3000/app
- Documentação interativa da API: http://localhost:8000/docs
- Saúde do backend e banco: http://localhost:8000/health

A primeira execução baixa as imagens e compila o frontend. O backend aplica as migrações automaticamente antes de iniciar. O banco começa vazio; cadastre seus próprios ingredientes. Não é necessário instalar Node ou Python no computador para usar o Compose.

```sh
docker compose ps
docker compose logs -f backend frontend
docker compose down
```

O volume `postgres_data` preserva os dados após reiniciar os serviços ou fechar o navegador. `docker compose down -v` apaga esse volume e **todos os dados**. As portas ficam vinculadas apenas ao computador local. O painel e a API exigem autenticação por e-mail e senha. Os usuários compartilham o mesmo espaço de trabalho.

## Fluxo de uso

1. Em **Ingredientes**, informe o nome, a quantidade em g/kg e o valor da embalagem. Consulte os custos por grama e quilograma. Pesquise, ordene, edite e arquive pelo menu da tabela.
2. Em **Receitas**, cadastre o rendimento, o tempo de produção e os ingredientes. Acrescente embalagens, despesas operacionais e mão de obra. Os resultados aparecem imediatamente.
3. Defina o lucro desejado sobre custo (markup). O preço praticado é independente do sugerido; deixá-lo vazio faz o sistema utilizar o sugerido.
4. Salve e reabra a receita. Exporte o PDF da versão salva ou abra **Precificar vendas**.
5. Compare custo proporcional com lotes completos. Salve a simulação para exportar o PDF e consultar seus valores históricos.

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

Novos ingredientes usam gramas (`g`) por padrão, com embalagem inicial de 1.000 g. Na receita, escolha um item da biblioteca, informe a quantidade usada e a unidade (g ou kg) e pressione **Adicionar ingrediente**; apenas selecionar não o inclui. Quantidade e unidade utilizadas continuam editáveis na própria linha. O botão de lápis abre o cadastro do ingrediente para alterar nome, embalagem, unidade e preço sem fechar a receita. Essas alterações são salvas na biblioteca e refletem em todas as receitas vinculadas; os históricos permanecem preservados.

A área anteriormente chamada Simulador agora aparece como **Precificação**, inclusive nos botões, históricos e PDFs. Os endpoints `/simulations` continuam compatíveis.

## Aparência

A interface usa bordô, branco e marrom. O botão de sol/lua no cabeçalho alterna os temas claro e escuro. A preferência é salva no navegador; na primeira visita, o sistema acompanha a preferência de aparência do dispositivo. PDFs usam a paleta clara para impressão.

## Padrão de arredondamento da exibição

- 5,26 → 5,26; 5,27 / 5,28 / 5,29 → 5,30; 5,97 → 6,00.
- O limite é comparado ao valor original: 5,269 é menor que 5,27 e recebe apenas o arredondamento normal para duas casas (5,27).
- Valores negativos seguem a mesma regra em magnitude, preservando o sinal (−5,27 → −5,30).
- Telas e PDFs usam duas casas para moedas, percentuais e quantidades decimais. Valores pequenos podem aparecer como 0,00, mas continuam contribuindo para os custos com precisão integral.
- A formatação não regrava dados nem arredonda resultados intermediários. Campos em repouso exibem o padrão; ao editar, apresentam o valor em centésimos para permitir sua alteração. Abrir um cadastro sem alterar o campo preserva o valor original salvo.
- Totais são calculados a partir dos valores originais, e não pela soma dos números arredondados exibidos.

## Telas de acesso

A rota `/login` permite entrar com e-mail e senha. O botão Google permanece indisponível e não cria sessões. O cadastro de usuários é feito pelo administrador diretamente no banco, sem cadastro público.

Depois de atualizar os serviços com `docker compose up --build -d`, crie uma conta:

```sh
docker compose exec backend python -m app.create_user voce@exemplo.com
```

O comando solicita a senha e a confirmação sem exibir o que você digita. Use entre 12 e 256 caracteres. Ele normaliza o e-mail, grava o usuário na tabela `users` e armazena apenas o hash scrypt da senha. E-mails duplicados são recusados. Fora do Docker, execute `python -m app.create_user voce@exemplo.com` na pasta `backend`, com `DATABASE_URL` configurada e as migrações aplicadas.

Entre em http://localhost:3000/login. A sessão dura sete dias, usa cookie HttpOnly/SameSite e é revogada ao clicar em **Sair**. Após cinco tentativas incorretas, a conta fica bloqueada por 15 minutos. Definir `users.is_active = false` bloqueia a conta e suas sessões imediatamente.

Todos os usuários acessam os ingredientes, receitas e históricos existentes do mesmo negócio. Não há separação de dados entre contas. Não existe usuário ou senha padrão.

Para implantação com HTTPS, configure `AUTH_COOKIE_SECURE=true` e inclua a origem exata do frontend em `CORS_ORIGINS` (lista separada por vírgulas). Em desenvolvimento, localhost e 127.0.0.1 na porta 3000 são permitidos por padrão. A tabela `users` mantém o e-mail em texto para identificação, mas nunca a senha; a tabela `user_sessions` mantém somente o hash dos tokens.

Os testes de domínio do backend usam uma dependência autenticada de teste; `test_auth.py` exercita a autenticação real. Para os testes E2E de receitas e ingredientes, forneça `E2E_STORAGE_STATE` com o caminho de um estado Playwright autenticado de uma conta no banco de testes.

## Privacidade e integração Google

Consulte [proteção de logs, banco e backups](docs/PRIVACIDADE.md) para chaves, backup, restauração e limites. Consulte [integração Google](docs/GOOGLE_LOGIN.md) para configurar o projeto no Google Cloud e conhecer as etapas restantes de autenticação e autorização.
