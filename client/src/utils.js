import Web3 from "web3";

const getWeb3 = () =>
  new Promise((resolve, reject) => {
    // Modern dapp browsers...
    if (window.ethereum) {
      const web3 = new Web3(Web3.givenProvider);
      // Request account access if needed
      window.ethereum
        .request({ method: "eth_requestAccounts" })
        .then(() => window.ethereum.request({ method: "eth_accounts" }))
        .then((accounts) => resolve([web3, accounts]))
        .catch((e) => reject(e));
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      // Use Mist/MetaMask's provider.
      const web3 = window.web3;
      console.log("Injected web3 detected.");
      resolve([web3, web3.eth.accounts]);
    }
    // Fallback to localhost; use dev console port by default...
    else {
      console.log("No web3 instance injected!");
      reject();
    }
  });

export default getWeb3;
