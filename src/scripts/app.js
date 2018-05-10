(function() {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the cards
    app.updateJobs();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function() {
    // Add the newly selected city
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    if (!app.selectedCities) {
      app.selectedCities = [];
    }
    app.getJobs(key, label);
    app.selectedCities.push({key: key, label: label});
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a card with the latest jobs. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateJobCard = function(data) {
    var dataLastUpdated = new Date(data.created);

    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.card-last-updated');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    cardLastUpdatedElem.textContent = data.created;

    var options = { year: 'numeric', month: 'short', day: '2-digit'};
    var formattedDate = new Intl.DateTimeFormat('sv-SE', options).format(data.created);
    card.querySelector('.date').textContent = formattedDate;

    data.soklista.sokdata.sort(function (a, b) {
      return b.antal_platsannonser - a.antal_platsannonser;
    });

    var topAreas = data.soklista.sokdata.slice(0, 3)
                                        .map(app.createAreaElement);

    var container = card.querySelector('.areas');
    container.textContent = '';

    topAreas.forEach(function (area) {
      container.appendChild(area);
    });

    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };

  app.createAreaElement = function (area) {
    var element = document.createElement('div');
    element.className = 'area';
    element.textContent = `${area.namn}: ${area.antal_platsannonser} annonser`;

    return element;
  }


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  /*
   * Gets a jobs for a specific city and updates the card with the data.
   * getJobs() first checks if the data is in the cache. If so,
   * then it gets that data and populates the card with the cached data.
   * Then, getJobs() goes to the network for fresh data. If the network
   * request goes through, then the card gets updated a second time with the
   * freshest data.
   */
  app.getJobs = function(key, label) {
    var url = `http://api.arbetsformedlingen.se/af/v0/platsannonser/matchning?lanid=${key}&grupperat=1`;
    if ('caches' in window) {
      caches.match(url).then(function (response) {
        if (response) {
          response.json().then(function updateFromCache(json) {
            var results = json;
            results.key = key;
            results.label = label;
            results.created = new Date();
            app.updateJobCard(results);
          })
        }
      });
    }

    // Fetch the latest data.
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          var results = response;
          results.key = key;
          results.label = label;
          results.created = new Date();
          app.updateJobCard(results);
        }
      } else {
        // Return the initial jobs since no data is available.
        app.updateJobCard(initialJobs);
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest data
  app.updateJobs = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getJobs(key);
    });
  };

  app.saveSelectedCities = function() {
    var selectedCities = JSON.stringify(app.selectedCities);
    localStorage.selectedCities = selectedCities;
  };

  /*
   * Fake  data that is presented when the user first uses the app,
   * or when the user has not saved any cities.
   */
  var initialJobs = {
    "key": 1,
    "label": "Stockholm",
    "created": new Date(2018, 4, 10, 15, 50),
    "soklista": {
      "listnamn": "grupperat yrkesområde",
      "totalt_antal_platsannonser": 14902,
      "totalt_antal_ledigajobb": 29,
      "sokdata": [
        {
          "id": "1",
          "namn": "Administration, ekonomi, juridik",
          "antal_platsannonser": 1784,
          "antal_ledigajobb": 3
        },
        {
          "id": "2",
          "namn": "Bygg och anläggning",
          "antal_platsannonser": 649,
          "antal_ledigajobb": 0
        },
        {
          "id": "3",
          "namn": "Data/IT",
          "antal_platsannonser": 1488,
          "antal_ledigajobb": 0
        },
        {
          "id": "4",
          "namn": "Kropps- och skönhetsvård",
          "antal_platsannonser": 107,
          "antal_ledigajobb": 0
        },
        {
          "id": "5",
          "namn": "Försäljning, inköp, marknadsföring",
          "antal_platsannonser": 1987,
          "antal_ledigajobb": 5
        },
        {
          "id": "6",
          "namn": "Hantverksyrken",
          "antal_platsannonser": 60,
          "antal_ledigajobb": 0
        },
        {
          "id": "7",
          "namn": "Hotell, restaurang, storhushåll",
          "antal_platsannonser": 1026,
          "antal_ledigajobb": 9
        },
        {
          "id": "8",
          "namn": "Hälso- och sjukvård",
          "antal_platsannonser": 1593,
          "antal_ledigajobb": 1
        },
        {
          "id": "9",
          "namn": "Industriell tillverkning",
          "antal_platsannonser": 188,
          "antal_ledigajobb": 0
        },
        {
          "id": "10",
          "namn": "Installation, drift, underhåll",
          "antal_platsannonser": 464,
          "antal_ledigajobb": 0
        },
        {
          "id": "11",
          "namn": "Kultur, media, design",
          "antal_platsannonser": 187,
          "antal_ledigajobb": 0
        },
        {
          "id": "12",
          "namn": "Sanering och renhållning",
          "antal_platsannonser": 425,
          "antal_ledigajobb": 1
        },
        {
          "id": "13",
          "namn": "Naturbruk",
          "antal_platsannonser": 86,
          "antal_ledigajobb": 0
        },
        {
          "id": "14",
          "namn": "Naturvetenskapligt arbete",
          "antal_platsannonser": 78,
          "antal_ledigajobb": 0
        },
        {
          "id": "15",
          "namn": "Pedagogiskt arbete",
          "antal_platsannonser": 1987,
          "antal_ledigajobb": 9
        },
        {
          "id": "16",
          "namn": "Socialt arbete",
          "antal_platsannonser": 1052,
          "antal_ledigajobb": 0
        },
        {
          "id": "17",
          "namn": "Säkerhetsarbete",
          "antal_platsannonser": 95,
          "antal_ledigajobb": 0
        },
        {
          "id": "18",
          "namn": "Tekniskt arbete",
          "antal_platsannonser": 423,
          "antal_ledigajobb": 0
        },
        {
          "id": "19",
          "namn": "Transport",
          "antal_platsannonser": 682,
          "antal_ledigajobb": 0
        },
        {
          "id": "20",
          "namn": "Chefer och verksamhetsledare",
          "antal_platsannonser": 537,
          "antal_ledigajobb": 1
        },
        {
          "id": "22",
          "namn": "Militärt arbete",
          "antal_platsannonser": 4,
          "antal_ledigajobb": 0
        }
      ]
    }
  };

  app.selectedCities = localStorage.selectedCities;
  if (app.selectedCities) {
    app.selectedCities = JSON.parse(app.selectedCities);
    app.selectedCities.forEach(function(city) {
      app.getJobs(city.key, city.label);
    });
  } else {
    /* The user is using the app for the first time, or the user has not
     * saved any cities, so show the user some fake data. A real app in this
     * scenario could guess the user's location via IP lookup and then inject
     * that data into the page.
     */
    app.updateJobCard(initialJobs);
    app.selectedCities = [
      {key: initialJobs.key, label: initialJobs.label}
    ];
    app.saveSelectedCities();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./service-worker.js')
             .then(function() {
               console.log('Service Worker Registered');
             })
  }
})();
