$(function() { 
  var restPath =  '../scripts/metrics.js/';
  var dataURL = restPath + 'trend/json';
  var backgroundColor = '#ffffff';
  var SEP = '_SEP_';
  var colors = [
    '#3366cc','#dc3912','#ff9900','#109618','#990099','#0099c6','#dd4477',
    '#66aa00','#b82e2e','#316395','#994499','#22aa99','#aaaa11','#6633cc',
    '#e67300','#8b0707','#651067','#329262','#5574a6','#3b3eac','#b77322',
    '#16d620','#b91383','#f4359e','#9c5935','#a9c413','#2a778d','#668d1c',
    '#bea413','#0c5922','#743411'
  ];

  var defaults = {
    tab:0,
    overall0:'show',
    overall1:'hide',
  };

  var state = {};
  $.extend(state,defaults);

  function createQuery(params) {
    var query, key, value;
    for(key in params) {
      value = params[key];
      if(value == defaults[key]) continue;
      if(query) query += '&';
      else query = '';
      query += encodeURIComponent(key)+'='+encodeURIComponent(value);
    }
    return query;
  }

  function getState(key, defVal) {
    return window.sessionStorage.getItem(key) || state[key] || defVal;
  }

  function setState(key, val, showQuery) {
    state[key] = val;
    window.sessionStorage.setItem(key, val);
    if(showQuery) {
      var query = createQuery(state);
      window.history.replaceState({},'',query ? '?' + query : './');
    }
  }

  function setQueryParams(query) {
    var vars, params, i, pair;
    vars = query.split('&');
    params = {};
    for(i = 0; i < vars.length; i++) {
      pair = vars[i].split('=');
      if(pair.length == 2) setState(decodeURIComponent(pair[0]), decodeURIComponent(pair[1]),false);
    }
  }

  var search = window.location.search;
  if(search) setQueryParams(search.substring(1));

  $('#clone_button').button({icons:{primary:'ui-icon-newwin'},text:false}).click(function() {
    window.open(window.location);
  });

  $('#overall-acc > div').each(function(idx) {
    $(this).accordion({
      heightStyle:'content',
      collapsible: true,
      active: getState('overall'+idx, 'hide') == 'show' ? 0 : false,
      activate: function(event, ui) {
        var newIndex = $(this).accordion('option','active');
        setState('overall'+idx, newIndex === 0 ? 'show' : 'hide', true);
        $.event.trigger({type:'updateChart'});
      }
    });
  });

  $('#tabs').tabs({
    active: getState('tab', 0),
    activate: function(event, ui) {
      var newIndex = ui.newTab.index();
      setState('tab', newIndex, true);
      $.event.trigger({type:'updateChart'});
    },
    create: function(event,ui) {
      $.event.trigger({type:'updateChart'});
    }
  }); 

  var db = {};
  $('#total').chart({
    type: 'trend',
    metrics: ['bps'],
    stack:true,
    colors: colors,
    backgroundColor: backgroundColor,
    units: 'Bits per Second'},
  db);
  $('#inout').chart({
    type: 'trend',
    metrics: ['bps_in','bps_out'],
    legend: ['In','Out'],
    colors: colors,
    backgroundColor: backgroundColor,
    units: 'Bits per Second'},
  db);
  $('#topprotocols').chart({
    type: 'topn',
    stack: true,
    sep: SEP,
    metric: 'top-5-protocols',
    legendHeadings: ['Protocol'],
    colors: colors,
    backgroundColor: backgroundColor,
    units: 'Bits per Second'},
  db); 

  function updateData(data) {
    if(!data 
      || !data.trend 
      || !data.trend.times 
      || data.trend.times.length == 0) return;

    if(db.trend) {
      // merge in new data
      var maxPoints = db.trend.maxPoints;
      var remove = db.trend.times.length > maxPoints ? db.trend.times.length - maxPoints : 0;
      db.trend.times = db.trend.times.concat(data.trend.times);
      if(remove) db.trend.times = db.trend.times.slice(remove);
      for(var name in db.trend.trends) {
        db.trend.trends[name] = db.trend.trends[name].concat(data.trend.trends[name]);
        if(remove) db.trend.trends[name] = db.trend.trends[name].slice(remove);
      }
    } else db.trend = data.trend;

    db.trend.start = new Date(db.trend.times[0]);
    db.trend.end = new Date(db.trend.times[db.trend.times.length - 1]);

    $.event.trigger({type:'updateChart'});
  }

  function pollTrends() {
    $.ajax({
      url: dataURL,
      data: db.trend && db.trend.end ? {after:db.trend.end.getTime()} : null,
      success: function(data) {
        updateData(data);
        setTimeout(pollTrends, 1000);
      },
      error: function(result,status,errorThrown) {
        setTimeout(pollTrends,5000);
      },
      timeout: 60000
    });
  };
	
  $(window).resize(function() {
    $.event.trigger({type:'updateChart'});
  });

  $(document).ready(function() {
    pollTrends();
  });
});
