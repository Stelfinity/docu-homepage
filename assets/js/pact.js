

const DEFAULT_GAS_PRICE = 0.00000001;
const MAIN_NET_ID = "mainnet01";
const TEST_NET_ID = "testnet04";

const LOCAL_ACCOUNT_KEY = "LOCAL_ACCOUNT_KEY";
const IS_X_WALLET_KEY = "IS_X_WALLET_KEY";

const POLL_INTERVAL_S = 5;

const chainId = "1";
const gasPrice = "0.002";
const netId = MAIN_NET_ID;
var account = null;
const networkUrl = "null";
const currTransactionState = null;
const isConnectWallet = null;
var isXwallet = null;



function setChainId() {

}

function disconnectWallet() {
  account = null;
}

function setGasPrice() {

}

function setNetId() {

}

function setAccount(a) {
  account = a;
}

function setNetworkUrl() {

}

function setCurrTransactionState() {

}

function setIsConnectWallet() {

}

function setIsXwallet() {

}

function getAccount() {
  return account;
}

  const setNetworkSettings = (netId, chainId, gasPrice) => {
    setNetId(netId);
    setChainId(chainId);
    setGasPrice(gasPrice);
  };

  const useSetNetworkSettings = (
    netId,
    chainId,
    gasPrice = DEFAULT_GAS_PRICE
  ) => {
    useEffect(() => {
      setNetworkSettings(netId, chainId, gasPrice);
    }, [netId, chainId, gasPrice]);
  };

  const sendTransaction = async (
    cmd,
    previewComponent = null,
    transactionMessage = null,
    successCallback = () => {}
  ) => {
    setCurrTransactionState({
      transactionMessage,
      successCallback,
      cmdToConfirm: cmd,
      previewComponent,
    });
  };

  const signTransaction = async (cmdToSign) => {
    updateTransactionState({ signingCmd: cmdToSign });
    let signedCmd = null;
    if (isXwallet) {
      let xwalletSignRes = null;
      try {
        const accountConnectedRes = await window.kadena.request({
          method: "kda_requestAccount",
          networkId: netId,
          domain: window.location.hostname,
        });
        console.log(accountConnectedRes);
        if (accountConnectedRes?.status !== "success") {
          toast.error("X Wallet connection was lost, please re-connect");
          clearTransaction();
          logoutAccount();
          return;
        } else if (accountConnectedRes?.wallet?.account !== account.account) {
          toast.error(
            `Wrong X Wallet account selected in extension, please select ${account.account}`
          );
          return;
        } else if (accountConnectedRes?.wallet?.chainId !== chainId) {
          toast.error(
            `Wrong chain selected in X Wallet, please select ${chainId}`
          );
          return;
        }
        xwalletSignRes = await window.kadena.request({
          method: "kda_requestSign",
          networkId: netId,
          data: { networkId: netId, signingCmd: cmdToSign },
        });
      } catch (e) {
        console.log(e);
      }
      if (xwalletSignRes.status !== "success") {
        toast.error("Failed to sign the command in X-Wallet");
        clearTransaction();
        return;
      }
      signedCmd = xwalletSignRes.signedCmd;
    } else {
      try {
        signedCmd = await Pact.wallet.sign(cmdToSign);
      } catch (e) {
        console.log(e);
        toast.error("Failed to sign the command in the wallet");
        clearTransaction();
        return;
      }
    }
    console.log(signedCmd);
    updateTransactionState({ signedCmd });
    let localRes = null;
    try {
      localRes = await fetch(`${networkUrl}/api/v1/local`, mkReq(signedCmd));
    } catch (e) {
      console.log(e);
      toast.error("Failed to confirm transaction with the network");
      clearTransaction();
      return;
    }
    const parsedLocalRes = await parseRes(localRes);
    console.log(parsedLocalRes);
    if (parsedLocalRes?.result?.status === "success") {
      let data = null;
      try {
        data = await Pact.wallet.sendSigned(signedCmd, networkUrl);
      } catch (e) {
        console.log(e);
        toast.error("Had issues sending the transaction to the blockchain");
        clearTransaction();
        return;
      }
      console.log(data);
      const requestKey = data.requestKeys[0];
      updateTransactionState({
        sentCmd: signedCmd,
        requestKey,
      });
      await pollForTransaction(requestKey);
    } else {
      console.log(parsedLocalRes);
      toast.error(`Couldn't sign the transaction`, {
        hideProgressBar: true,
      });
      clearTransaction();
      return;
    }
  };

  const clearTransaction = () => {
    setCurrTransactionState({});
  };

  const openConnectWallet = async (account) => {
    //setIsConnectWallet(true);
    console.log("Connectiong wallet...");
  };

  const setConnectedWallet = async (account, isXwallet) => {
    if (account != null) {
      if (isXwallet) {
        try {
          await window.kadena.request({
            method: "kda_disconnect",
            networkId: netId,
          });
          await window.kadena.request({
            method: "kda_connect",
            networkId: netId,
          });
          const res = await window.kadena.request({
            method: "kda_connect",
            networkId: netId,
          });
          if (res.status !== "success") {
            console.log(`Could not connect to X Wallet`);
            closeConnectWallet();
            return;
          }
          if (res.account?.account !== account.account) {
            console.log(
              "Tried to connect to X Wallet but not with the account entered. Make sure you have logged into the right account in X Wallet"
            );
            closeConnectWallet();
            return;
          }
          if (res.account?.chainId !== chainId) {
            console.log(`You need to select chain ${chainId} from X Wallet`);
            closeConnectWallet();
            return;
          }
        } catch (e) {
          console.log(e);
          console.log("Couldn't connect to Xwallet");
          closeConnectWallet();

          return;
        }
      }
      setIsXwallet(isXwallet);
      setAccount(account);
      console.log("Wallet connected: " + account)
      trySaveLocal(LOCAL_ACCOUNT_KEY, account);
      trySaveLocal(IS_X_WALLET_KEY, isXwallet);
    } else {
      console.log("Wallet disconnected.");
      setAccount(null);
      trySaveLocalAccount(null);
    }
    closeConnectWallet();
  };

  const closeConnectWallet = () => {
    setIsConnectWallet(false);
  };

  const logoutAccount = async () => {
    if (isXwallet) {
      await window.kadena.request({
        method: "kda_disconnect",
        networkId: netId,
      });
    }
    trySaveLocal(LOCAL_ACCOUNT_KEY, null);
    trySaveLocal(IS_X_WALLET_KEY, false);
    setAccount(null);
    setIsXwallet(false);
    setIsConnectWallet(false);
  };

  const defaultMeta = (gasLimit) => {
    return Pact.lang.mkMeta(
      "",
      chainId,
      gasPrice,
      gasLimit ?? 150000,
      creationTime(),
      600
    );
  };

  const readFromContract = async (cmd, returnError) => {
    try {
      let data = await Pact.fetch.local(cmd, networkUrl);
      if (data?.result?.status === "success") {
        return data.result.data;
      } else {
        console.log(data);
        if (returnError === true) {
          return data?.result?.error?.message;
        } else {
          return null;
        }
      }
    } catch (e) {
      toast.error("Had trouble fetching data from the blockchain");
      console.log(e);
    }
    return null;
  };

  const fetchAccountDetails = async (accountName) => {
    return await readFromContract({
      pactCode: `(coin.details ${JSON.stringify(accountName)})`,
      meta: defaultMeta(),
    });
  };

  const updateTransactionState = (newParams) => {
    const { transactionMessage, successCallback } = { currTransactionState };
    setCurrTransactionState({
      transactionMessage,
      successCallback,
      ...newParams,
    });
  };

  const pollForTransaction = async (requestKey) => {
    let time_spent_polling_s = 0;
    let pollRes = null;
    const { transactionMessage } = currTransactionState;
    let waitingText = ("null");
    toast.info(waitingText, {
      position: "top-right",
      autoClose: 10000,
      hideProgressBar: false,
      draggable: true,
      toastId: requestKey,
    });
    while (time_spent_polling_s < 240) {
      await wait(POLL_INTERVAL_S * 1000);
      try {
        pollRes = await Pact.fetch.poll(
          { requestKeys: [requestKey] },
          networkUrl
        );
      } catch (e) {
        console.log(e);
        toast.error("Had trouble getting transaction update, will try again");
        continue;
      }
      if (Object.keys(pollRes).length !== 0) {
        break;
      }
      time_spent_polling_s += POLL_INTERVAL_S;
      waitingText = `Waiting ${
        time_spent_polling_s + POLL_INTERVAL_S
      }s for transaction ${requestKey.slice(0, 10)}... (${transactionMessage})`;
      toast.update(requestKey, { render: waitingText });
    }

    if (pollRes[requestKey].result.status === "success") {
      toast.update(requestKey, {
        render: `Succesfully completed ${requestKey.slice(
          0,
          10
        )}... (${transactionMessage})`,
        type: "success",
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        draggable: true,
      });
      if (currTransactionState?.successCallback != null) {
        currTransactionState.successCallback();
      }
      console.log(pollRes);
    } else {
      console.log(pollRes);
      toast.error(
        `Failed transaction ${requestKey}... (${transactionMessage})`,
        {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          draggable: true,
        }
      );
    }
    clearTransaction();
  };

/* Non hook based helper function */
function getNetworkUrl(netId, chainId) {
  if (netId == null && chainId == null) {
    return;
  }
  if (netId === TEST_NET_ID) {
    return `https://api.testnet.chainweb.com/chainweb/0.0/${TEST_NET_ID}/chain/${chainId}/pact`;
  } else if (netId === MAIN_NET_ID) {
    return `https://api.chainweb.com/chainweb/0.0/${MAIN_NET_ID}/chain/${chainId}/pact`;
  }
  throw new Error("networkId must be testnet or mainnet");
}

function creationTime() {
  return Math.round(new Date().getTime() / 1000) - 10;
}

function mkReq(cmd) {
  return {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(cmd),
  };
}

async function parseRes(raw) {
  const rawRes = await raw;
  const res = await rawRes;
  if (res.ok) {
    const resJSON = await rawRes.json();
    return resJSON;
  } else {
    const resTEXT = await rawRes.text();
    return resTEXT;
  }
}

const wait = async (timeout) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

function tryLoadLocal(key) {
  let val = localStorage.getItem(key);
  if (val == null) {
    return null;
  }
  try {
    return JSON.parse(val);
  } catch (e) {
    console.log(e);
    return null;
  }
}

function tryLoadLocalAccount() {
  let account = localStorage.getItem(LOCAL_ACCOUNT_KEY);
  if (account == null) {
    return null;
  }
  try {
    console.log(account);
    return JSON.parse(account);
  } catch (e) {
    console.log(e);
    return null;
  }
}

function trySaveLocal(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.log(e);
    return;
  }
}

function trySaveLocalAccount(account) {
  try {
    if(account == null) {
      localStorage.removeItem(LOCAL_ACCOUNT_KEY)
    } else {
      localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(account));
    }
  } catch (e) {
    console.log(e);
    return;
  }
}
