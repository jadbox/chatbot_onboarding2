import React, { useEffect, useState } from "react";
import "./styles.css";
import "@jadbox/iframe-provider-polyfill";
// import Web3 from "web3";

// version 0.5
function redirect(urlParams, account, setState) {
  if (urlParams.has("redirect")) {
    let paramRaw = urlParams.get("redirect");
    paramRaw = decodeURI(paramRaw);
    if (paramRaw.indexOf("http") === -1) {
      paramRaw = "https://" + paramRaw;
    }
    console.log("paramRaw", paramRaw);
    const url = new URL(paramRaw);
    url.searchParams.append("dest", "ethereum:" + account);

    window.location.href = url.href;
    console.log("redirecting to", url);
    return true;
  } else {
    console.log("address", account);
    setState(x => ({
      ...x,
      msg: "Wallet account connected!",
      // account: account,
      stage: 12
    }));

    // window.location.href.indexOf(".app") < 0 &&
    if (window.close) window.close();
    return false;
  }
}

async function getAccount(setState) {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("address")) {
    redirect(urlParams, urlParams.get("address"), setState);
    return;
  }

  var account = 0;
  if (window.ethereum) {
    // for modern DApps browser
    // window.ethereum; //
    // if (!window.web3) window.web3 = new Web3(window.ethereum);
    try {
      if (window.ethereum.enable) await window.ethereum.enable();
    } catch (error) {
      console.error(error);
    }
  } else if (window.web3) {
    console.error("old web3 provider found");
    // for old DApps browser
    // window.web3 = new Web3(window.web3.currentProvider);
    // window.web3 = window.ethereum;
  } else {
    console.log(
      "Non-Ethereum browser detected. You should consider trying MetaMask!"
    );
  }

  if (window.ethereum !== "undefined") {
    setState(x => ({ ...x, msg: "found web3", stage: 1 }));
    console.log("window.ethereum", window.ethereum);
    await window.ethereum.send("eth_accounts").then(it => {
      console.log("ww", it);
      account = it.result[0];

      setState(x => ({
        ...x,
        msg: `Calling back using public key: ${account}.`,
        stage: 1,
        account: account
      }));

      if (urlParams.has("callback")) {
        const callbackURL = urlParams.get("callback");
        const bodyData = {
          id: urlParams.get("id"),
          wallet_address: account
        };

        console.log("calling callback");
        return fetch(callbackURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          redirect: "follow",
          body: JSON.stringify(bodyData)
        })
          .then(() => {
            console.log("calling callback finished");
            redirect(urlParams, account, setState);
          })
          .catch(e => {
            console.error("callback err", e);
          });
      } else {
        redirect(urlParams, account, setState);
      }
    });
  }
  if (!account) throw new Error("no account");
  return account;
}

export default function App() {
  const [state, setState] = useState({ addr: "", msg: "", stage: 0 });

  const run = () => {
    return getAccount(setState).then(c => setState(x => ({ ...x, acct: c })));
  };

  const isRdy = document.readyState === "complete";

  useEffect(() => {
    if (!window.eventLoad) {
      window.addEventListener("load", () => {
        setState(x => ({ ...x, loaded: true }));
      });
      window.eventLoad = true;
    }
    if (document.readyState && !isRdy) return;
    // window.addEventListener("load", () => {
    console.log("loaded");
    if (window.location.search.indexOf("destAmount") > 0) {
      const destAmount = new URL(window.location.href).searchParams.get(
        "destAmount"
      );

      let rurl =
        "https://uniswap.exchange/swap/0x87d7b6CfAaeC5988FB17AbAEe4C16C3a79ceceB0";
      rurl += `?inputCurrency=ETH&exactField=input&exactAmount=${destAmount}`;

      window.location.href = rurl;
      return;
    }

    try {
      run();
    } catch (e) {
      // just try again in 2s
      setTimeout(() => {
        run();
      }, 2000);
    }
  }, [isRdy]);

  return (
    <div className="App">
      {state.stage < 10 && (
        <>
          <h1>Please sign into MetaMask/Wallet.</h1>
          <p>{state.addr ? JSON.stringify(state.addr) : ""}</p>
          <h4>{state.msg ? state.msg : "status: waiting for Wallet"}</h4>
        </>
      )}

      {state.stage > 9 && (
        <>
          <h1>{state.msg ? state.msg : "status: waiting for Wallet"}</h1>
          <h4>
            {"You can close the window now..."}
            <br />
            {state.account}
          </h4>
        </>
      )}
    </div>
  );
}
