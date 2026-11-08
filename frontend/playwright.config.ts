import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',fullyParallel:false,workers:1,timeout:60000,
 use:{storageState:process.env.E2E_STORAGE_STATE,baseURL:process.env.E2E_BASE_URL||'http://127.0.0.1:3000',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
 reporter:[['list'],['html',{open:'never'}]],
});
