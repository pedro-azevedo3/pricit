import { test, expect } from '@playwright/test';

test('telas de acesso com Google e navegação entre login e cadastro', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('izyprice-theme', 'dark'));
  await page.goto('/');
  await page.getByRole('link', { name: 'Entrar', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', {level: 1})).toContainText('Entre e fique');
  await page.getByRole('button', {name:'Entrar com Google'}).click();
  await expect(page.getByRole('status')).toContainText('ainda não está disponível');
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.locator('img[alt^="Mascote"]').evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({path:`test-results/auth-${testInfo.project.name}-login.png`, fullPage: true, animations:'disabled'});
  await page.getByRole('link', {name:'Registre-se',exact:true}).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', {name:'Cadastrar-se com Google'})).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole('button', {name: /Ativar tema/})).toHaveCount(0);
  await expect(page.locator('[data-public-page]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.locator('img[alt^="Mascote"]').evaluate((img: HTMLImageElement) => img.decode());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({path:`test-results/auth-${testInfo.project.name}-register.png`, fullPage:true, animations:'disabled'});
  await page.getByRole('button', {name:'Cadastrar-se com Google'}).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.getByRole('link', {name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', {name:'Voltar ao início'}).click();
  await expect(page).toHaveURL('/');
});


test('login por e-mail exibe erro e envia as credenciais', async ({page}) => {
  await page.route('**/api/v1/auth/login', async route => {
    expect(route.request().postDataJSON()).toEqual({email:'pessoa@example.com',password:'senha-de-teste-123'});
    await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({detail:'E-mail ou senha inválidos.'})});
  });
  await page.goto('/login');
  await page.getByLabel('E-mail', {exact:true}).fill('pessoa@example.com');
  await page.getByLabel('Senha', {exact:true}).fill('senha-de-teste-123');
  await page.getByRole('button', {name:'Entrar com e-mail e senha',exact:true}).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
  await expect(page.getByRole('button', {name:'Entrar com e-mail e senha',exact:true})).toBeEnabled();
  await expect(page).toHaveURL(/\/login$/);
});

test('painel sem sessão redireciona para login', async ({browser}) => {
  const context = await browser.newContext({storageState:{cookies:[],origins:[]}});
  const page = await context.newPage();
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login$/);
  await context.close();
});


test('servidor bloqueia /app sem JavaScript e com cookie falso', async ({browser, baseURL}) => {
  const context = await browser.newContext({javaScriptEnabled:false,storageState:{cookies:[],origins:[]}});
  try {
    const response = await context.request.get('/app', {maxRedirects:0});
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe('/login');
    expect(await response.text()).not.toContain('Seu espaço de gestão');
    await context.addCookies([{name:'pricit_session',value:'sessao-inventada',url:baseURL!}]);
    const forged = await context.request.get('/app', {maxRedirects:0});
    expect(forged.status()).toBe(307);
    expect(forged.headers().location).toBe('/login');
    const page = await context.newPage();
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', {level:1})).toContainText('Entre e fique');
  } finally {
    await context.close();
  }
});

test('sessão válida permite acesso direto e sessão revogada bloqueia acesso', async ({browser}) => {
  const email = process.env.E2E_AUTH_EMAIL;
  const password = process.env.E2E_AUTH_PASSWORD;
  test.skip(!email || !password, 'Requer conta temporária no banco de testes.');
  const context = await browser.newContext({storageState:{cookies:[],origins:[]}});
  try {
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('E-mail', {exact:true}).fill(email!);
    await page.getByLabel('Senha', {exact:true}).fill(password!);
    await page.getByRole('button', {name:'Entrar com e-mail e senha',exact:true}).click();
    await expect(page).toHaveURL(/\/app$/);
    const authenticated = await context.request.get('/app', {maxRedirects:0});
    expect(authenticated.status()).toBe(200);
    expect(await authenticated.text()).toContain('Seu espaço de gestão');
    const cookie = (await context.cookies()).find(cookie => cookie.name === 'pricit_session');
    expect(cookie).toBeDefined();
    await page.reload();
    await expect(page.getByRole('button', {name:'Sair',exact:true})).toBeVisible();
    await page.getByRole('button', {name:'Sair',exact:true}).click();
    await expect(page).toHaveURL(/\/login$/);
    await context.addCookies([cookie!]);
    const revoked = await context.request.get('/app', {maxRedirects:0});
    expect(revoked.status()).toBe(307);
    expect(revoked.headers().location).toBe('/login');
  } finally {
    await context.close();
  }
});


test('prévia pública usa a biblioteca real com exemplos e não consulta dados privados',async({page})=>{
  const calls:string[]=[];
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/v1/'))calls.push(request.url());});
  for(const route of ['/login','/cadastro']){
    await page.goto(route);
    const preview=page.locator('[data-application-preview]');
    await expect(preview).toHaveAttribute('inert','');
    await expect(preview).toHaveAttribute('aria-hidden','true');
    await expect(preview.locator('h1')).toHaveText('Biblioteca de ingredientes');
    await expect(preview.locator('tbody tr')).toHaveCount(4);
    await expect(preview.locator('tbody')).toContainText('Farinha de trigo');
    await expect(preview.locator('.brand-sidebar')).toHaveCount(1);
    await expect(page.getByRole('button',{name:/Ativar tema/})).toHaveCount(0);
  }
  expect(calls).toEqual([]);
});
