import React, { useEffect, useState } from "react";
import "./styles.css";
import "@jadbox/iframe-provider-polyfill";

import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import Button from "@material-ui/core/Button";

import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import { Typography } from "@material-ui/core";
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
    console.log("finished: address", account);
    setState((x) => ({
      ...x,
      msg: "Wallet account connected!",
      // account: account,
      stage: 10,
    }));

    // window.location.href.indexOf(".app") < 0 &&
    if (window.close) window.close();
    return false;
  }
}

const urlParams = new URLSearchParams(window.location.search);

async function getAccount(setState) {
  if (urlParams.has("address")) {
    redirect(urlParams, urlParams.get("address"), setState);
    return;
  }

  if (window.ethereum) {
    // for modern DApps browser
    // window.ethereum; //
    // if (!window.web3) window.web3 = new Web3(window.ethereum);
    let resp;
    try {
      if (window.ethereum.enable) resp = await window.ethereum.enable();
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
    setState((x) => ({ ...x, msg: "found web3", stage: 1 }));
    console.log("window.ethereum", window.ethereum);

    let cmd = null;
    if (window.ethereum.request) {
      cmd = window.ethereum.request({ method: "eth_accounts" });
      console.log("using request");
    } else if (window.ethereum.send) {
      const re = {
        jsonrpc: "2.0",
        method: "eth_accounts",
      };
      cmd = window.ethereum.send(re);
      console.log("using send");
    } else {
      throw new Error(
        "Internal error: no request or send found. Do you have Metamask installed?"
      );
    }

    await cmd.then((it) => {
      const response = it.length !== undefined ? it : it.result;
      if (response.length === undefined) {
        throw new Error('Error: could not fetch wallet address');
        return;
      }

      console.log("ww", it);
      // account = response[0];

      setState((x) => ({
        ...x,
        // msg: `Calling back using public key: ${account}.`,
        stage: 1,
        accounts: response,
      }));
    });
  }
}

function confirm(account, setState) {
  if (urlParams.has("callback")) {
    const callbackURL = urlParams.get("callback");
    const bodyData = {
      id: urlParams.get("id"),
      wallet_address: account,
    };

    console.log("calling callback");
    return fetch(callbackURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      body: JSON.stringify(bodyData),
    })
      .then(() => {
        console.log("calling callback finished");
        setState((s) => ({ ...s, stage: 10 }));
        redirect(urlParams, account, setState);
      })
      .catch((e) => {
        console.error("callback err", e);
      });
  } else {
    redirect(urlParams, account, setState);
  }
}

export default function App() {
  const [state, setState] = useState({ addr: "", msg: "", stage: 0 });
  const [value, setValue] = React.useState(null);

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  const run = () => {
    return getAccount(setState);
  };

  const isRdy = document.readyState === "complete";

  useEffect(() => {
    if (window.ethereum)
      window.ethereum.on("accountsChanged", function (accounts) {
        console.log("accountsChanged");
        run();
      });
  }, []);

  useEffect(() => {
    if (!window.eventLoad) {
      window.addEventListener("load", () => {
        setState((x) => ({ ...x, loaded: true }));
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

  function onSubmit() {
    const v = value || state.accounts[0];
    // console.log("submit", v);
    setState(s => ({...s, account: v }) )
    confirm(v, setState);
  }

  return (
    <div className="App">
      {!state.accounts && (
        <>
          <h1>Please sign into MetaMask/Wallet.</h1>
          <p>{state.addr ? JSON.stringify(state.addr) : ""}</p>
          <h4>{state.msg ? state.msg : "status: waiting for Wallet"}</h4>
        </>
      )}

      {state.accounts && state.accounts.length === 0 && (
        <Card style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Typography variant="h5" style={{padding: 12}}>
            Opps, no wallet found!<br/>please create a wallet or enable web3/metamask for
            this page.
          </Typography>
        </Card>
      )}

      {!state.account && state.accounts && state.accounts.length > 0 && (
        <Card style={{ maxWidth: "600px", margin: "0 auto" }}>
          <CardContent>
            <FormControl component="fieldset">
              <FormLabel
                component="legend"
                style={{ fontSize: "2em", margin: 16 }}
              >
                Confirm your wallet account:
              </FormLabel>
              <RadioGroup
                aria-label="accounts"
                name="accounts"
                value={state.accounts[0]}
                onChange={handleChange}
              >
                {state.accounts.map((x) => (
                  <FormControlLabel
                    value={x}
                    key={x}
                    control={<Radio />}
                    label={x}
                  />
                ))}
              </RadioGroup>
            </FormControl>
            <Typography variant="body1" color="primary">
              <i>Please check the wallet address above is correct, otherwise use Metamask/web3 to switch wallets if needed.</i>
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              style={{ display: "block", margin: "0 auto" }}
              onClick={onSubmit}
              variant="contained"
              color="primary"
            >
              Confirm
            </Button>
          </CardActions>
        </Card>
      )}

    {state.stage !== 10 && state.account && (
        <Card style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Typography variant="h5" style={{padding: 12}}>
            Please wait a moment...
          </Typography>
        </Card>
      )}

      {state.stage === 10 && (
        <>
          <h1>All done!</h1>
          <h4>
            {"You can safely close the window now..."}
            <br /> <br /> <br /> <br />
            connected: {state.account}
          </h4>
        </>
      )}
    </div>
  );
}
