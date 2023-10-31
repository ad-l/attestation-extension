import * as jose from 'jose'

window.cache = {};

function evalPolicy(policy, claims)
{
  for(var c in policy) {
    if(!(c in claims)) return false;
    var cmp; for(cmp in policy[c]);
    console.log(`EVAL('${claims[c]}', '${cmp}', '${policy[c][cmp]}')`)
    if(cmp == "="){
      if(claims[c] != policy[c][cmp] && policy[c][cmp] != "$WEBSITE_PUBLIC_KEY$") return false;
    } else if (cmp == "<=") {
      if(claims[c] > policy[c][cmp]) return false;
    } else if (cmp == ">=") {
      if(claims[c] < policy[c][cmp]) return false;
    }
  }
  return true;
}

async function add(origin)
{
  if(cache[origin]) return;
  cache[origin] = {pending: 1};
  var tokens = {};

  try {
    const atr = await fetch(origin+"/attest", {
      method: "GET",
      mode: "cors",
      cache: "no-cache"
    });

    tokens = await atr.json();
    tokens.cpu_claims = jose.decodeJwt(tokens.cpu);
    tokens.gpu_claims = jose.decodeJwt(tokens.gpu);
    tokens.site_trusted = false;
  } catch(e) {
    delete cache[origin];
    return;
  }

  // Try to find the origin in the stored configuration
  chrome.storage.sync.get([origin], x => {
    if(!(origin in x)) return false;
    x = x[origin];
    tokens.site_trusted = true;

    // GPU token is easy (keys are standard JWKS)
    const gpukeys = jose.createRemoteJWKSet(new URL(x.gpu_jwks));
    jose.jwtVerify(tokens.gpu, gpukeys, {clockTolerance: "1 hour"})
    .then(x => {tokens.gpu_trusted = true;})
    .catch(e => {console.dir(e); tokens.gpu_trusted = false;})

    /** FIXME
    // CPU is painful, must convert from x5c
    const tmp = await fetch(x.cpu_jwks);
    const cpp = jose.decodeProtectedHeader(tokens.cpu);
    const keys = await tmp.json();
    let x5c = find(keys, cpp.kid)
    const cpukeys = await jose.importX509(x5c, "RSA")    

    // Validate tokens
    jose.jwtVerify(tokens.cpu, cpukeys)
      .then(x => {tokens.cpu_trusted = true;})
      .catch(e => {console.dir(e); tokens.cpu_trusted = false;})
    */
     tokens.cpu_trusted = true;
     tokens.cpu_policy = x.cpu_policy;
     tokens.gpu_policy = x.gpu_policy;

     tokens.cpu_policy_pass = evalPolicy(JSON.parse(x.cpu_policy), tokens.cpu_claims);
     tokens.gpu_policy_pass = evalPolicy(JSON.parse(x.gpu_policy), tokens.gpu_claims);
  });

  console.dir(tokens);
  cache[origin] = tokens;
}

async function handleTabChange (tabs) {

}

// listen to tab URL changes
browser.tabs.onUpdated.addListener(handleTabChange)

// listen to tab switching
browser.tabs.onActivated.addListener(handleTabChange)

// listen for window switching
browser.windows.onFocusChanged.addListener(handleTabChange)

// update when the extension loads initially
handleTabChange()


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.init) {
      add(sender.origin);
      return;
    }
  }
);