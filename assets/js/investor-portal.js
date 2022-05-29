user_nft_id = [];



function setUserNFT_IDs(res) {
  user_nft_id = res.result.data;
}

function showUserNFTs() {
  // Do some frontend Stuff
  user_nft_id.forEach((x, i) => console.log(x));
}
