document.cookie = "__attestation_extension__=True;max-age=1";

/*
chrome.runtime.onMessage.addListener(
    function(message, callback) {
      if (message == "changeColor"){
        chrome.tabs.executeScript({
          code: 'document.body.style.backgroundColor="orange"'
        });
      }
    });
async function () => {
    const response = await chrome.runtime.sendMessage({greeting: "hello"});
    // do something with response here, not outside the function
    console.log(response);
  })();
*/

window.addEventListener("message", function(e) {
    if(e.origin != self.origin) return;
    console.log("Content script event: "+e.data)
    if(e.data == "__attestation_init")
    {
        chrome.runtime.sendMessage({init: e.origin});
    }
});
