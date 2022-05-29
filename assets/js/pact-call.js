const apiHostTestnet = `https://api.testnet.chainweb.com/chainweb/0.0/testnet04/chain/1/pact`;
const apiHostMainnet = `https://api.chainweb.com/chainweb/0.0/mainnet01/chain/1/pact`;
const gasLimit = 600000;

const server = apiHostMainnet;


async function getUserNFTs() {
  // Calls smart contract and stores NFT IDs. Fails if Gas is to low, even we don't send the transaction.
  if(account!=null) {
  const res = await Pact.fetch.local({
          pactCode : `(free.collect-gallinas.get-user-gallinas "k:b78e8b0cb99105bba985403ec86f42001df6069fc7933d520b1f2407d0a09aca")`,
           //pactCode: `(free.collect-gallinas.get-user-gallinas "${account}")`,
        //  pactCode: `(free.poll2.get-all-questions)`,
          meta: Pact.lang.mkMeta("", "", 0.0001, gasLimit, creationTime(), 600)
        }, server).then(r => {
          setUserNFT_IDs(r);
          showUserNFTs();
        }).catch( e => {console.log(e);});
        //const all = res.result.data;
}
}
