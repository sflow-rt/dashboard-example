// author: InMon Corp.
// version: 0.1
// date: 9/23/2015
// description: sFlow-RT Real-time Dashboard Example
// copyright: Copyright (c) 2015 InMon Corp.

include(scriptdir() + '/inc/trend.js');

var trend = new Trend(300,1);
var points;

var SEP = '_SEP_';

// define flows, prepend application name to avoid name clashes with other apps
setFlow('dashboard_example_bytes', {value:'bytes',t:2, fs: SEP});
setFlow('dashboard_example_stack', {keys:'stack', value:'bytes', n:10, t:2, fs:SEP}); 

var other = '-other-';
function calculateTopN(metric,n,minVal,total_bps) {     
  var total, top, topN, i, bps;
  top = activeFlows('ALL',metric,n,minVal,'sum');
  var topN = {};
  if(top) {
    total = 0;
    for(i in top) {
      bps = top[i].value * 8;
      topN[top[i].key] = bps;
      total += bps;
    }
    if(total_bps > total) topN[other] = total_bps - total;
  }
  return topN;
}

setIntervalHandler(function() {
  var now, res, total_bps;
  now = (new Date()).getTime();

  points = {};

  res = metric('ALL','sum:dashboard_example_bytes,sum:ifinoctets,ifoutoctets');
  points['bps'] = 0;
  points['bps_in'] = 0;
  points['bps_out'] = 0;
  if(res && res.length && res.length >= 3) {
    if(res[0].metricValue) points['bps'] += 8 * res[0].metricValue;
    if(res[1].metricValue) points['bps_in'] += 8 * res[1].metricValue;
    if(res[2].metricValue) points['bps_out'] += 8 * res[2].metricValue;
  }
  points['top-5-protocols'] = calculateTopN('dashboard_example_stack',5,1,points.bps);
  trend.addPoints(points);
},1);

setHttpHandler(function(req) {
  var result, key, name, path = req.path;
  if(!path || path.length == 0) throw "not_found";
     
  switch(path[0]) {
    case 'trend':
      if(path.length > 1) throw "not_found"; 
      result = {};
      result.trend = req.query.after ? trend.after(parseInt(req.query.after)) : trend;
      break;
    case 'metric':
      if(path.length == 1) result = points;
      else {
        if(path.length != 2) throw "not_found";
        if(points.hasOwnProperty(path[1])) result = points[path[1]];
        else throw "not_found";
      }
      break;
    default: throw 'not_found';
  } 
  return result;
});

