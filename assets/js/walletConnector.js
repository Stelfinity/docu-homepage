

function initWallet() {
  // after loading the page. Read account from local storage and load user's NFTs
  var loadedAccount = tryLoadLocalAccount();
  if(loadedAccount != null) {
      setAccount(loadedAccount);
      document.getElementById('openWalletPopupButton').innerText = cropAccountName(account);
      getUserNFTs();
  } else {
    // No account connected
  }
}
window.onload = initWallet;

function cropAccountName(a) {
  // Transforms input a to shorter string. EG: k:fb437bfz43b98f9483ug9b54g3u08gbn4508ugb04594fkvds  --> k:fb437...4fkvds
  res = a;
  if(a.length > 18) {
    res = "";
    res += a.substring(0,10) + "..." + a.substring(a.length-8, a.length);
  }
  return res;
}

function openWalletPopup() {
  if(getAccount() == null) {
    // nice popup -> call setConnectedWallet to connect
    setConnectedWallet("k:b78e8b0cb99105bba985403ec86f42001df6069fc7933d520b1f2407d0a09aca", false);
    getUserNFTs();
    document.getElementById('openWalletPopupButton').innerText = cropAccountName(account);
  } else {
    // wallet is connected, lets disconnect.
    setConnectedWallet(null, false);
    document.getElementById('openWalletPopupButton').innerText = "CONNECT WALLET";
  }
}

function myFunction() {
}
