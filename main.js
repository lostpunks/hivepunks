var HivePunks = {};
HivePunks.ABI = [
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"mintPunk","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint8","name":"numberOfPunks","type":"uint8"}],"name":"mintPunks","outputs":[],"stateMutability":"payable","type":"function"}
];

var BaseURLs = {};
var ConnectedWallet = {};

var increment = function() {
  let quantityInput = document.getElementById('quantity-input');
  quantityInput.innerHTML = Math.min(10, parseInt(quantityInput.innerHTML) + 1);
};

var decrement = function() {
  let quantityInput = document.getElementById('quantity-input');
  quantityInput.innerHTML = Math.max(1, parseInt(quantityInput.innerHTML) - 1);
};

window.addEventListener('load', function() {
    if (window.ethereum) {
        let web3 = new Web3(ethereum);
        window.web3 = web3;
    } else if (typeof web3 !== 'undefined') {
        window.web3 = new Web3(web3.currentProvider);
    } else {
        let web3 = new Web3("https://cloudflare-eth.com");
        window.web3 = web3;
    }

    const queryString = window.location.search;
    const parameters = new URLSearchParams(queryString);
    const useTestNetwork = (parameters.get('test') === "true");

    BaseURLs.opensea = "https://" + (useTestNetwork ? "testnets." : "") + "opensea.io/assets/";
    BaseURLs.etherscan = "https://" + (useTestNetwork ? "rinkeby." : "") + "etherscan.io/tx/";
    HivePunks.address = useTestNetwork ? "0xb69af52aF8b56b208d7D0E523Ba5AC712f877f0a" : "0x887ec3a5419d2836de4b13cedf34ac3ed3ec1442";

    HivePunks.contract = new web3.eth.Contract(HivePunks.ABI, HivePunks.address);

    loadContent();
});

var loadContent = function() {
  HivePunks.contract.methods.totalSupply().call((error, totalSupply) => {
    if(error) {
      console.log(error);
      return;
    }

    let salesLabel = document.getElementById('sales-label');

    let soldOut = totalSupply >= 10000;
    salesLabel.innerHTML = (soldOut ? "sold out" : "public sale open") + " • " + totalSupply + "/10000 minted";

    if (!soldOut) {
      loadNewContent();
    }

    if (totalSupply <= 0) {
      return;
    }

    let punkIndex = totalSupply - 1;
    loadPunkContent(punkIndex, 'old-label', 'old-image', 'old-button', "Last mint: ");
  });        
};

var loadNewContent = function() {
  let newLabel = document.getElementById('new-label');
  let newImage = document.getElementById('new-image');
  let newButton = document.getElementById('new-button');

  newLabel.innerHTML = "Mint for free (gas only):";
  newLabel.style.opacity = 100;
  newImage.style.opacity = 100;

  if (ConnectedWallet.account) {
      prepareMint(punkIndex);
  } else {
      newButton.innerHTML = "Connect Wallet";
      newButton.onclick = function() { connectWallet() };
      newButton.style.opacity = 100;
  }
};

var loadPunkContent = function(punkIndex, labelID, imageID, buttonID, labelPrefix) {
  HivePunks.contract.methods.tokenURI(punkIndex).call((error, punkURI) => {
    if(!error) {
      let label = document.getElementById(labelID);
      let image = document.getElementById(imageID);
      let button = document.getElementById(buttonID);

      let metadata = JSON.parse(atob(punkURI.replace("data:application/json;base64,", "")));
      image.innerHTML = atob(metadata["image"].replace("data:image/svg+xml;base64,", ""));
      label.innerHTML = labelPrefix + "HivePunk #" + punkIndex;
      label.style.opacity = 100;

      button.innerHTML = "View on OpenSea";
      button.onclick = function() { 
          let url = BaseURLs.opensea + HivePunks.address + '/' + punkIndex;
          window.open(url, '_blank').focus();
      }
      button.style.opacity = 100;
    } else {
      console.log(error);
    }
  });
};

var connectWallet = async () => {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    ConnectedWallet.account = accounts[0];
    prepareMint();
};

var prepareMint = function () {
  let button = document.getElementById('new-button');
  let quantityInput = document.getElementById('quantity-input');
  let incrementButton = document.getElementById('increment-button');
  let decrementButton = document.getElementById('decrement-button');
  button.innerHTML = "Mint";
  button.onclick = function() { mint() };
  button.style.opacity = 100;
  quantityInput.style.opacity = 100;
  decrementButton.style.opacity = 100;
  incrementButton.style.opacity = 100;
};

var mint = async () => {
  let quantity = parseInt(document.getElementById('quantity-input').innerHTML);

  const tx = {
    from: ConnectedWallet.account, 
    to: HivePunks.address, 
    value: parseInt(0).toString(16),
    data: (quantity == 1) ? HivePunks.contract.methods.mintPunk().encodeABI() : HivePunks.contract.methods.mintPunks(quantity).encodeABI()
  };

  let label = document.getElementById('new-label');
  let button = document.getElementById('new-button');

  await ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx],
  })
  .then(function (txHash) {
    label.innerHTML = "Minting HivePunk...";
    label.style.opacity = 100;
    button.innerHTML = "View on Etherscan";
    button.onclick = function() { 
      let url = BaseURLs.etherscan + txHash;
      window.open(url, '_blank').focus();
    }
    button.style.opacity = 100;
    return waitForTransaction(txHash);
  })
  .then(function(receipt) {
    let logs = receipt["logs"];
    let topics = logs[logs.length - 1]["topics"];
    let tokenIndex = parseInt(topics[topics.length - 1], 16);
    loadNewPunkContent(tokenIndex);
  });
};

var loadNewPunkContent = function(punkIndex) {
  let quantityInput = document.getElementById('quantity-input');
  let incrementButton = document.getElementById('increment-button');
  let decrementButton = document.getElementById('decrement-button');
  quantityInput.style.opacity = 0;
  incrementButton.style.opacity = 0;
  decrementButton.style.opacity = 0;

  loadPunkContent(punkIndex, 'new-label', 'new-image', 'new-button', "");
};

var waitForTransaction = function(txHash) {
  return new Promise(function(resolve, reject) {
    (function attempt(triesLeft) {
      web3.eth.getTransactionReceipt(txHash, function(err, res) {
        if (err) return reject(err);
        if (res) return resolve(res);
        if (!triesLeft) return reject("max_tries_exceeded");
        setTimeout(attempt.bind(null, triesLeft-1), 5000);
      });
    })(60);
  });
};

