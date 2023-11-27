import * as jose from 'jose'

window.cache = {};

// FIXME Maybe use the SKR policy language instead?
// This is called by the action popup to show which claims are met or not
window.evalClaim = function(policy, claim) {
  var cmp; for(cmp in policy);
  var val = policy[cmp];
  console.log(`EVAL('${claim}', '${cmp}', '${val}')`)
  if(cmp == "="){
    if(claim == val || val == "$WEBSITE_PUBLIC_KEY$") return true;
  } else if (cmp == "<=" || cmp == ">=") {
    if(claim == val) return true;
    if(/^([0-9]+)([.][0-9]+)+$/.test(val)) {
      val = val.split(".");
      if(claim.split(".").every((v, i) => {
        if(!val[i]) return true;
        return (cmp == "<=" ? Number(v) <= Number(val[i]) : Number(v) >= Number(val[i]));
      })) return true;
    }
    else if(cmp == "<=" ? claim < val : claim > val) return true;
  }
  return false;
}

function evalPolicy(policy, claims) {
  for(var c in policy) {
    if(!(c in claims)) return false;
    if(!evalClaim(policy[c], claims[c])) return false;
  }
  return true;
}

async function readLocalStorage(key) {
  return new Promise((resolve, reject) => {
    console.log("STORE GET "+key)
    chrome.storage.sync.get(null, function (result) {
      console.log("RES: ")
      console.dir(result);
      console.log(result[key]);
      if (result[key] === undefined) {
        reject(new Error("Not in cache"));
      } else {
        resolve(result[key]);
      }
    });
  });
}

async function add(origin) {
  console.log("Checking attestation for "+origin)

  if(cache[origin]){
    if(!cache[origin].ts || Date.now() - cache[origin].ts > 1000*60*5) {
       console.log("Re-checking website "+origin);
       delete cache[origin];
    }else{
      console.log("Website has been checked recently, using cache");
      return cache[origin];
    }
  }
  cache[origin] = {pending: 1, ts: Date.now()};
  var tokens = {gpu_trusted:false, cpu_trusted:false, site_trusted:false,
    cpu_policy:"{}", gpu_policy: "{}", cpu_policy_pass: false, gpu_policy_pass:false, ts:Date.now()};

  // Try to find the origin in the stored configuration
  let site_config = {};
  try {
    console.log("GET "+origin);
    site_config = await readLocalStorage(origin);
    tokens.site_trusted = true;
  } catch(e) {console.log("Failed to check config for "+origin+": "+e)}

  try {
    const atr = await fetch(origin+"/attest", {
      method: "GET",
      mode: "cors",
      cache: "no-cache"
    });

    const t = await atr.json();
    for(var i in t) tokens[i] = t[i];
  } catch(e) {
    delete cache[origin];
    return tokens;
  }

  try {
    tokens.cpu_claims = jose.decodeJwt(tokens.cpu);
  }catch(e) {
    tokens.cpu_claims = {};
  }

  try{
    tokens.gpu_claims = jose.decodeJwt(tokens.gpu);
  } catch(e) {
    tokens.gpu_claims = {};
  }

  if(tokens.site_trusted) {
    // GPU token is easy (keys are standard JWKS)
    const gpukeys = jose.createRemoteJWKSet(new URL(site_config.gpu_jwks));
    try {
      await jose.jwtVerify(tokens.gpu, gpukeys, {clockTolerance: "1 hour"});
      tokens.gpu_trusted = true;
    }catch(e){
      console.dir(e);
      tokens.gpu_trusted = false;
    }

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
    tokens.cpu_policy = site_config.cpu_policy;
    tokens.gpu_policy = site_config.gpu_policy;

    tokens.cpu_policy_pass = evalPolicy(JSON.parse(site_config.cpu_policy), tokens.cpu_claims);
    tokens.gpu_policy_pass = evalPolicy(JSON.parse(site_config.gpu_policy), tokens.gpu_claims);
  } else {
    tokens.cpu_trusted = false;
    tokens.gpu_trusted = false;
  }

  console.dir(tokens);
  cache[origin] = tokens;
  updateIcon(origin);
  return tokens;
}

async function updateIcon(o)
{
  if(typeof cache[o] == "object")
  {
    if(cache[o].site_trusted){
      const trusted = cache[o].cpu_trusted && cache[o].gpu_trusted && cache[o].cpu_policy_pass && cache[o].gpu_policy_pass;
      return await chrome.browserAction.setIcon({path:"icons/"+(trusted ? "attested" : "danger")+".png"});
    }
  }
  await chrome.browserAction.setIcon({path: "icons/action.png"});
}

async function handleTabChange () {
  let tabs = await browser.tabs.query({active: true, currentWindow: true});
  if(!tabs.length || !tabs[0].url) return;
  try {
    let u = new URL(tabs[0].url);
    updateIcon(u.origin);
  }catch(e){}
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
      add(sender.origin).then(x => {
        console.log("Sending event to injected script "+x)
        sendResponse(x);
      });
      return true;
    }
  }
);