const KEY='mgp_v35';const load=()=>JSON.parse(localStorage.getItem(KEY)||'{"giro":0,"cash":0,"history":[]}');const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
