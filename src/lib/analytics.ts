const PH_KEY = (import.meta as any).env?.VITE_POSTHOG_KEY || '';
const PH_HOST = (import.meta as any).env?.VITE_POSTHOG_HOST || 'https://app.posthog.com';

function getDistinctId(){
  try{
    const k = 'ph_distinct_id';
    let v = localStorage.getItem(k);
    if (!v){ v = crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
  }catch{ return Math.random().toString(36).slice(2); }
}

export function track(event: string, properties?: Record<string, any>){
  try{
    if (!PH_KEY) return;
    const distinct_id = getDistinctId();
    const payload = { api_key: PH_KEY, event, distinct_id, properties: properties||{} };
    const url = PH_HOST.replace(/\/$/, '') + '/capture/';
    if (navigator.sendBeacon){
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(()=>{});
    }
  }catch{}
}

export function identify(properties?: Record<string, any>){
  try{
    if (!PH_KEY) return; const distinct_id = getDistinctId(); track('$identify', { distinct_id, ...(properties||{}) });
  }catch{}
}