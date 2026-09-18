const FIX=2156.99;function calc(s){const total=s.giro+s.cash;const d=Math.max(1,30-new Date().getDate());return{total,day:total/d,week:(total/d)*7}}
