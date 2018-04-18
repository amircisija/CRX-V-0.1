/**
 * Our Vue.js application.
 *
 * This manages the entire front-end website.
 */

// The API we're using for grabbing metadata about each cryptocurrency
// (including logo images). The service can be found at:
// https://www.cryptocompare.com/api/
let CRYPTOCOMPARE_API_URI = "https://min-api.cryptocompare.com";
let CRYPTOCOMPARE_URI = "https://www.cryptocompare.com";

// The API we're using for grabbing cryptocurrency prices.  The service can be
// found at: https://coinmarketcap.com/api/
let COINMARKETCAP_API_URI = "https://api.coinmarketcap.com";

// The amount of milliseconds (ms) after which we should update our currency
// charts.
let UPDATE_INTERVAL = 60 * 600;




let bpiDefault = { change: '', code: '' }
new Vue({
  el: '#Calc',
  data: {
    endpoint: 'https://api.coindesk.com/v1/bpi/',
    trade: 'BTC',
    selectedCurrency: null,
    timestamp: null,
    bpi: Object.assign({}, bpiDefault),
    inverted: false,
    value: null,
    supportedCurrencies: ['BAM', 'USD', 'AUD', 'EUR', 'CAD'],
    loading: false,
    interval: null,
    blurred: false
  },
  mounted() {
    this.selectedCurrency = this.supportedCurrencies[0];
    this.getUpdatedPrice();

    this.interval = setInterval(() => {
      this.getUpdatedPrice();
    }, 10000);
  },
  beforeDestroy() {
    clearInterval(this.interval);
  },
  methods: {
    getUpdatedPrice() {
      this.loading = true;
      axios.get(this.endpoint + 'currentprice/' + this.selectedCurrency + '.json')
        .then(res => {
          if (res && res.data) {
            this.timestamp = moment().local('bs').format('LT');
            this.bpi = Object.assign(bpiDefault, res.data.bpi[this.selectedCurrency]);
            this.getHistorical();
          }

          this.loading = false;
        })
        .catch(error => {
          this.loading = false;
          console.log(error);
        });
    },
    getHistorical() {
      axios.get(this.endpoint + 'historical/close.json?currency=' + this.selectedCurrency + '&for=yesterday')
        .then(res => {
          if (res && res.data) {
            const y = Object.values(res.data.bpi)[0];
            this.bpi.change = (this.rate - y) * 100 / y;
          }
        })
        .catch(error => {
          alert(error);
        });
    },
    setCurrency(code) {
      this.selectedCurrency = code;
      this.getUpdatedPrice();
    }
  },
  computed: {
    inputValue: {
      get() {
        return this.value;
      },
      set(value) {
        this.blurred = isNaN(value);
        if (this.blurred) {
          return;
        }
        this.value = Number(value);
      }
    },
    rate() {
      return this.bpi ? this.bpi.rate_float : null;
    },
    displayRate() {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency || 'USD',
        minimumFractionDigits: 2,
      });

      return formatter.format(this.rate);
    },
    currency() {
      return this.bpi ? this.bpi.code : null;
    },
    change() {
      const formatter = new Intl.NumberFormat();
      return this.bpi ? formatter.format(this.bpi.change) : 'null';
    },
    conversion() {
      const val = this.inverted ? this.value * this.rate : this.value / this.rate;

      let opts = { minimumFractionDigits: this.inverted ? 2 : 4 };

      if (this.inverted) {
        opts.style = 'currency';
        opts.currency = this.currency || 'USD';
      }

      const formatter = new Intl.NumberFormat('en-US', opts);
      const result = formatter.format(val);
      return this.inverted ? result : result + ' ' + this.trade;
    }
  }
});






let app = new Vue({
  el: "#app",
  data: {
    coins: [],
    coinData: {}
  },
  methods: {

    /**
     * Load up all cryptocurrency data.  This data is used to find what logos
     * each currency has, so we can display things in a friendly way.
     */
    getCoinData: function () {
      let self = this;

      axios.get(CRYPTOCOMPARE_API_URI + "/data/all/coinlist")
        .then((resp) => {
          this.coinData = resp.data.Data;
          this.getCoins();
        })
        .catch((err) => {
          this.getCoins();
          console.error(err);
        });
    },

    /**
     * Get the top 10 cryptocurrencies by value.  This data is refreshed each 5
     * minutes by the backing API service.
     */
    getCoins: function () {
      let self = this;

      axios.get(COINMARKETCAP_API_URI + "/v1/ticker/?convert=BAM&limit=10")
        .then((resp) => {
          this.coins = resp.data;
        })
        .catch((err) => {
          console.error(err);
        });
    },

    /**
     * Given a cryptocurrency ticket symbol, return the currency's logo
     * image.
     */
    getCoinImage: function (symbol) {

      // These two symbols don't match up across API services. I'm manually
      // replacing these here so I can find the correct image for the currency.
      //
      // In the future, it would be nice to find a more generic way of searching
      // for currency images
      symbol = (symbol === "MIOTA" ? "IOT" : symbol);
      symbol = (symbol === "VERI" ? "VRM" : symbol);

      return CRYPTOCOMPARE_URI + this.coinData[symbol].ImageUrl;
    },

    /**
     * Return a CSS color (either red or green) depending on whether or
     * not the value passed in is negative or positive.
     */
    getColor: (num) => {
      return num > 0 ? "color:green;" : "color:red;";
    },
  },

  /**
   * Using this lifecycle hook, we'll populate all of the cryptocurrency data as
   * soon as the page is loaded a single time.
   */
  created: function () {
    this.getCoinData();
  }
});

/**
 * Once the page has been loaded and all of our app stuff is working, we'll
 * start polling for new cryptocurrency data every minute.
 *
 * This is sufficiently dynamic because the API's we're relying on are updating
 * their prices every 5 minutes, so checking every minute is sufficient.
 */
setInterval(() => {
  app.getCoins();
}, UPDATE_INTERVAL);
