const ioClient = io();
const MAX_POINTS = 200;

const tCtx = document.getElementById('tempChart').getContext('2d');
const hCtx = document.getElementById('humChart').getContext('2d');
const aCtx = document.getElementById('aqChart').getContext('2d');

function lineConfig(label){
  return { type:'line',
    data:{ labels:[], datasets:[{ label, data:[] }] },
    options:{ animation:false, responsive:true }
  };
}
const tempChart = new Chart(tCtx, lineConfig('Temperatura (°C)'));
const humChart  = new Chart(hCtx, lineConfig('Humedad (%)'));
const aqChart   = new Chart(aCtx, lineConfig('Calidad Aire (a.u.)'));

function pushPoint(chart, x, y){
  chart.data.labels.push(x);
  chart.data.datasets[0].data.push(y);
  if(chart.data.labels.length>MAX_POINTS){
    chart.data.labels.shift(); chart.data.datasets[0].data.shift();
  }
  chart.update();
}

async function bootstrap(){
  const latest = await fetch('/api/latest').then(r=>r.json());
  latest.forEach(s=>{
    const t = new Date(s.ts).toLocaleTimeString();
    pushPoint(tempChart,t,s.temperature);
    pushPoint(humChart,t,s.humidity);
    pushPoint(aqChart,t,s.airQuality);
  });
}
ioClient.on('sample',(s)=>{
  const t = new Date(s.ts).toLocaleTimeString();
  pushPoint(tempChart,t,s.temperature);
  pushPoint(humChart,t,s.humidity);
  pushPoint(aqChart,t,s.airQuality);
});
bootstrap();
