var $ = require('jquery');
const ext = browser.extension.getBackgroundPage();

function fill_table(t, claims, policy)
{
  console.dir(claims);
  console.dir(policy);
  for(var c in claims)
  {
    let tr = $("<tr></tr>");
    if(c in policy) {
      var op; for(op in policy[c]);
      tr.append($("<td></td>").append($("<b></b>").text(c)));
      const hint = $("<abbr></abbr>").attr("title",op+" "+policy[c][op]).text(claims[c]);
      if(!ext.evalClaim(policy[c], claims[c])) hint.css("color","#c00").css("font-weight","bold").css("text-decoration","line-through");
      tr.append($("<td></td>").append(hint));
    }else {
      tr.append($("<td></td>").text(c));
      if(typeof claims[c] == "object")
        tr.append($("<td></td>").append($("<textarea></textara>").val(JSON.stringify(claims[c])))); 
      else
        tr.append($("<td></td>").text(claims[c]));
    }
    t.append(tr);
  }
}

async function init(e){
  const tabs = await browser.tabs.query({active:true, currentWindow:true});
  const url = new URL(tabs[0].url);
  $("#name").text(url.hostname);

  if(ext.cache[url.origin]) {
    $("#error").hide();
    const o = ext.cache[url.origin];
    console.dir(o);

    if(o.pending) {
      $("#error").show().text("Attestation checking in progress...");
      setTimeout(()=>{location.reload()}, 1000);
      return;
    }
    let warn = x => {
      $("#emsg").show().text(x);
      $("html,body").css("background","#ffddcc");
    };
    let fatal = x => {
      $("#emsg").show().text(x);
      $("html,body").css("background","#ff9999");
    };
    if(o.site_trusted){
      if(!o.cpu_trusted){fatal("Failed to verify CPU attestation")}
      else if(!o.cpu_policy_pass){fatal("CPU attestation policy failed. Check table for mismatches.")}
      if(!o.gpu_trusted){fatal("Failed to verify GPU attestation")}
      else if(!o.gpu_policy_pass){fatal("GPU attestation policy failed. Check table for mismatches.")}
      else{ $("html,body").css("background","#c2f0c2"); $("#emsg").show().text("Attestations are valid and all policies are met.").css("color","#030");}
    } else {
      warn("This website is attested but you have not set a policy to trust it.")
    }
    $("#cpu,#gpu").css("display","inline-block");
    fill_table($("#cpuclaims"), o.cpu_claims, JSON.parse(o.cpu_policy));
    fill_table($("#gpuclaims"), o.gpu_claims, JSON.parse(o.gpu_policy));
    
    $("#jwt").show();
    $("#akey").text(o.jwk);
  } else {
    $("#error").show().text("This website does not support attestation");
  }
}

document.addEventListener('DOMContentLoaded', init);

$('#go-to-options').on('click', function() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});

/*
  function toHex(a){
    return a.map(x => x.toString(16).padStart(2, '0'))
        .join(':');
  }
  let info = ext.cache[url.hostname]; 
  let claims = info.claims[0].sgx_claims;

  let ns = url.hostname.split(".");
  ns[0] = "ns1"; ns = ns.join(".");

  
  $("#tab").append("<tr><td>Connection</td>"
    + `<td>${info.tlsVersion}, ${info.cipherSuite}, ${info.kexGroup}. ${info.latency}ms aDNS validation.</td>`
    + "</tr>");

  $("#tab").append(
    $("<tr>").append(
      $("<td>").text("DANE Record"),
      $("<td>").append(toHex([...info.tlsa]))
    )
  );

  $("#tab").append(
    $("<tr>").append(
      $("<td>").text("Pinned Key"),
      $("<td>").append(toHex(info.claims[0].custom_claims.sgx_report_data))
    )
  );

  let qtype = "sgx_claims" in info.claims[0] ?
    "Intel SGX (isolated process)" :
    "AMD SEV-SNP (isolated virtual machine)";

  let atable = $('<table>').append(
    $("<tr>").append(
      $("<td>").text(`TEE type`),
      $("<td>").text(qtype)
    ),
    $("<tr>").append(
      $("<td>").text(`Basename`),
      $("<td>").text(toHex(claims.basename))
    ),
    $("<tr>").append(
      $("<td>").text(`SVNs`),
      $("<td>").text(`PCE=${claims.pce_svn}, QE=${claims.qe_svn}, config=${claims.report_body.config_svn}, ISV=${claims.report_body.isv_svn}`)
    ),
    $("<tr>").append(
      $("<td>").text(`MRENCLAVE`),
      $("<td>").text(toHex(claims.report_body.mr_enclave))
    ),
    $("<tr>").append(
      $("<td>").text(`MRSIGNER`),
      $("<td>").text(toHex(claims.report_body.mr_signer))
    ),
    $("<tr>").append(
      $("<td>").text(`Attestation Key`),
      $("<td>").text(toHex(claims.signature_data.attest_pub_key))
    )
  );

  $("#tab").append(
    $("<tr>").append(
      $("<td>").text("SGX Attestation"),
      $("<td>").append(atable)
    )
  );
  
  let receipt = await fetch("https://"+ns+":8443/app/registration-receipt?service-name="+url.hostname,{credentials:"omit"})
  receipt = await receipt.json();
  console.log(receipt);
  receipt = receipt.receipt;
  let proof = receipt.proof.map(x => {return x.left}).join("\n");

  let rtable = $('<table>').append(
    $("<tr>").append(
      $("<td>").text(`Certificate`),
      $("<td>").append(`<textarea>${receipt.cert}</textare>`)
    ),
    $("<tr>").append(
      $("<td>").text(`Root Signature`),
      $("<td>").text(receipt.signature)
    ),
    $("<tr>").append(
      $("<td>").text(`Proof`),
      $("<td>").append(`<textarea>${proof}</textarea>`)
    )
  );

  $("#tab").append(
    $("<tr>").append(
      $("<td>").text("Registration"),
      $("<td>").append(rtable)
    )
  );
});

*/