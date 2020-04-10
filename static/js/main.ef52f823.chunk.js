(this["webpackJsonpgatesolve-ui"]=this["webpackJsonpgatesolve-ui"]||[]).push([[0],{228:function(t,e,n){t.exports=n(410)},233:function(t,e,n){},278:function(t,e){},280:function(t,e){},311:function(t,e){},316:function(t,e){},326:function(t,e){},327:function(t,e){},406:function(t,e,n){},410:function(t,e,n){"use strict";n.r(e);var o,a=n(2),r=n.n(a),i=n(222),c=n.n(i),l=n(157),u=(n(233),n(122)),s=n(42),d=n(72),p=n(73),f=n(74),g=(n(236),{id:"route-line",type:"line",paint:{"line-opacity":["coalesce",["get","opacity"],.5],"line-width":5,"line-color":["get","color"]}}),h={id:"route-point",type:"circle",paint:{"circle-radius":5,"circle-color":["get","color"]},filter:["==","Point",["geometry-type"]]},m={id:"route-point-symbol",type:"symbol",paint:{"text-color":"#000","text-halo-color":"#fff","text-halo-width":3},layout:{"text-field":["get","ref"],"text-anchor":"center","text-font":["Klokantech Noto Sans Regular"],"text-size":24,"text-offset":[0,-.05]},filter:["==","Point",["geometry-type"]]},v=n(227),b=function(t){var e=t.height,n=void 0===e?"50":e,o=t.style,a=void 0===o?{fill:"#444",stroke:"none"}:o;return r.a.createElement("svg",{height:n,style:a,viewBox:"-1 -1 17 17"},r.a.createElement("path",{d:"M7.5 0C5.068 0 2.23 1.486 2.23 5.27c0 2.568 4.054 8.244 5.27 9.73c1.081-1.486 5.27-7.027 5.27-9.73C12.77 1.487 9.932 0 7.5 0z"}))},y=function(t){var e=t.pin,n=e.height,o=void 0===n?"50":n,a=Object(v.a)(e,["height"]),i=t.marker;return(r.a.createElement(f.b,Object.assign({},i,{offsetLeft:-o/2,offsetTop:-o}),r.a.createElement(b,Object(s.a)({height:o},a))))},E=n(5),O=n.n(E),T=n(224),w=n(13),j=n(12),S=n(26),L=n(27),P=(n(110),n(70)),_=n(10),k=n.n(_),C=n(35),x=n.n(C),R=n(24),A=n.n(R),D=n(107),N=n.n(D),K=null===(o=Object({NODE_ENV:"production",PUBLIC_URL:"/gatesolve-ui",WDS_SOCKET_HOST:void 0,WDS_SOCKET_PATH:void 0,WDS_SOCKET_PORT:void 0}).REACT_APP_ROUTABLE_TILES)||void 0===o?void 0:o.replace(/\/$/,""),B=function(t){Object(L.a)(n,t);var e=Object(S.a)(n);function n(){return Object(w.a)(this,n),e.apply(this,arguments)}return Object(j.a)(n,[{key:"getIdForTileCoords",value:function(t){return"".concat(K,"/").concat(t.zoom,"/").concat(t.x,"/").concat(t.y)}}]),n}(x.a);Object({NODE_ENV:"production",PUBLIC_URL:"/gatesolve-ui",WDS_SOCKET_HOST:void 0,WDS_SOCKET_PATH:void 0,WDS_SOCKET_PORT:void 0}).REACT_APP_ROUTABLE_TILES&&(N.a.unbind(k.a.RoutableTileProvider),N.a.bind(k.a.RoutableTileProvider).to(B).inSingletonScope().whenTargetTagged("phase",A.a.Base),N.a.bind(k.a.RoutableTileProvider).to(B).inSingletonScope().whenTargetTagged("phase",A.a.Transit));var F=P.FlexibleRoadPlanner;function U(t){var e=[],n=[],o=new Map;return t.legs[0].getSteps().forEach((function(a){var r,i,c=a.stopLocation;"https://w3id.org/openstreetmap/terms#Steps"===(null===(r=t.context[a.through])||void 0===r?void 0:r.definedTags["https://w3id.org/openstreetmap/terms#highway"])&&(o.has(a.through)||o.set(a.through,[]),o.get(a.through).push([a.startLocation.longitude,a.startLocation.latitude],[a.stopLocation.longitude,a.stopLocation.latitude])),(null===(i=c.definedTags)||void 0===i?void 0:i["https://w3id.org/openstreetmap/terms#barrier"])&&(console.log(a.through,c.definedTags["https://w3id.org/openstreetmap/terms#barrier"].replace(/^.*#/,""),c.id,c.definedTags,c.freeformTags),n.push([c.longitude,c.latitude])),e.push([a.startLocation.longitude,a.startLocation.latitude]),e.push([a.stopLocation.longitude,a.stopLocation.latitude])})),[e,n,Array.from(o.values())]}function W(t,e,n,o,a,r){return{type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"LineString",coordinates:o||[]},properties:{color:"#000"}},{type:"Feature",geometry:{type:"MultiLineString",coordinates:r||[]},properties:{color:"#dc0451",opacity:1}},{type:"Feature",geometry:{type:"MultiPoint",coordinates:a||[]},properties:{color:"#dc0451",ref:"!"}},{type:"Feature",geometry:{type:"Point",coordinates:[t[1],t[0]]},properties:{color:"#00afff"}},{type:"Feature",geometry:{type:"Point",coordinates:[e[1],e[0]]},properties:{color:"#64be14",ref:n}}]}}function I(t,e,n){(function(t){var e,n,o=new URL("https://overpass-api.de/api/interpreter");return o.searchParams.append("data",(e=t[0],n=t[1],"\n  [out:json][timeout:25];\n  (\n    relation(around:10, ".concat(e,", ").concat(n,")[building];\n    way(r);\n    way(around:10, ").concat(e,", ").concat(n,")[building];\n  )->.b;\n  // gather results\n  (\n    node(w.b)[entrance];\n  );\n  // print results\n  out body;\n  >;\n  out skel qt;\n"))),fetch(o.toString()).then((function(t){return t.json().then((function(t){return t.elements.filter((function(t){return"node"===t.type&&"lat"in t&&null!=t.lat&&"lon"in t&&null!=t.lon&&t.tags&&t.tags.entrance}))}))}))})(e).then((function(t){return t.length?t:[{id:-1,type:"node",lat:e[0],lon:e[1]}]})).then((function(e){e.forEach((function(e){var o=new F;o.query({from:{latitude:t[0],longitude:t[1]},to:{latitude:e.lat,longitude:e.lon}}).take(1).on("data",function(){var a=Object(T.a)(O.a.mark((function a(r){var i,c,l,u,s,p,f,g,h;return O.a.wrap((function(a){for(;;)switch(a.prev=a.next){case 0:return a.next=2,o.completePath(r);case 2:l=a.sent,console.log("Plan",l,"from",t,"to",e),u=U(l),s=Object(d.a)(u,3),p=s[0],f=s[1],g=s[2],h=W(t,[e.lat,e.lon],(null===(i=e.tags)||void 0===i?void 0:i.ref)||(null===(c=e.tags)||void 0===c?void 0:c["addr:unit"]),p,f,g),n(h);case 7:case"end":return a.stop()}}),a)})));return function(t){return a.apply(this,arguments)}}())}))}))}n(406);var M=[60.16295,24.93071],H=[60.16259,24.93155],z={origin:M,destination:H,route:W(M,H),viewport:{latitude:60.163,longitude:24.931,zoom:16,bearing:0,pitch:0}},q=function(t){if(!t)throw Error("This cannot happen as URL isn't actually optional.");return{url:t.replace("https://static.hsldev.com/mapfonts/Klokantech Noto Sans","https://fonts.openmaptiles.org/Klokantech Noto Sans")}},V=function(t){return t.split(",").map(Number)},J=function(){var t=Object(p.e)({path:"/route/:from/:to"}),e=Object(a.useState)(z),n=Object(d.a)(e,2),o=n[0],i=n[1];Object(a.useEffect)((function(){t&&i((function(e){return Object(s.a)({},e,{origin:V(t.params.from),destination:V(t.params.to)})}))}),[]);var c=Object(p.d)();return Object(a.useEffect)((function(){c.location.pathname!=="/route/".concat(o.origin,"/").concat(o.destination,"/")&&c.replace("/route/".concat(o.origin,"/").concat(o.destination,"/"))}),[c,o.origin,o.destination]),Object(a.useEffect)((function(){i((function(t){return Object(s.a)({},t,{route:W(o.origin,o.destination)})})),I(o.origin,o.destination,(function(t){i((function(e){var n;return o.origin!==e.origin||o.destination!==e.destination?e:((n=t.features).push.apply(n,Object(u.a)(e.route.features)),Object(s.a)({},e,{route:t}))}))}))}),[o.origin,o.destination]),r.a.createElement("div",{"data-testid":"app",className:"App"},r.a.createElement("header",{className:"App-header"},r.a.createElement("h2",null,"Gatesolve")),r.a.createElement(f.d,Object.assign({},o.viewport,{width:"100%",height:"90%",mapStyle:"https://raw.githubusercontent.com/HSLdevcom/hsl-map-style/master/simple-style.json",transformRequest:q,onViewportChange:function(t){return i((function(e){return Object(s.a)({},e,{viewport:t})}))},onClick:function(t){0===t.srcEvent.button&&i((function(e){return Object(s.a)({},e,{destination:[t.lngLat[1],t.lngLat[0]]})}))},onContextMenu:function(t){i((function(e){return Object(s.a)({},e,{origin:[t.lngLat[1],t.lngLat[0]]})})),t.srcEvent.preventDefault()}}),r.a.createElement(f.c,{type:"geojson",data:o.route},r.a.createElement(f.a,g),r.a.createElement(f.a,h),r.a.createElement(f.a,m)),r.a.createElement(y,{marker:{draggable:!0,onDragEnd:function(t){i((function(e){return Object(s.a)({},e,{origin:[t.lngLat[1],t.lngLat[0]]})}))},longitude:o.origin[1],latitude:o.origin[0]},pin:{style:{fill:"#00afff",stroke:"#fff"}}}),r.a.createElement(y,{marker:{draggable:!0,onDragEnd:function(t){i((function(e){return Object(s.a)({},e,{destination:[t.lngLat[1],t.lngLat[0]]})}))},longitude:o.destination[1],latitude:o.destination[0]},pin:{style:{fill:"#64be14",stroke:"#fff"}}})))};Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));c.a.render(r.a.createElement(r.a.StrictMode,null,r.a.createElement(l.a,null,r.a.createElement(J,null))),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(t){t.unregister()})).catch((function(t){console.error(t.message)}))}},[[228,1,2]]]);
//# sourceMappingURL=main.ef52f823.chunk.js.map