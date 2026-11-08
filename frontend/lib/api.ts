export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string, options?:RequestInit):Promise<T>{
 let response:Response;
 try {response=await fetch('/api/v1'+path,{...options,headers:{'Content-Type':'application/json',...options?.headers},cache:'no-store'});} catch {throw new Error('Não foi possível conectar ao servidor. Tente novamente.');}
 if(response.status===401 && !path.startsWith('/auth/') && typeof window!=='undefined'){window.location.replace('/login');}
 if(!response.ok){let detail;try {detail=(await response.json()).detail;} catch {detail=null;}
 throw new ApiError(typeof detail==='string'?detail:Array.isArray(detail)?'Revise os campos: '+detail.map((e:{loc:string[];msg:string})=>`${e.loc.slice(1).join('.')}: ${e.msg}`).join('; '):'Não foi possível concluir a ação. Tente novamente.',response.status);}
 return response.status===204?undefined as T:response.json();
}
