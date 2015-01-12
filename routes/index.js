var scraper = require('../src/scraper');
var appConfig = require('../src/appConfig');

module.exports = function(router){
    router.get('/', function(req, res){
        scraper.create(appConfig, function(scraperInstance){
            if(!appConfig.numPages){
                console.warn('numPages option not set - will only scrape 1 page');
            }

            var numPages = appConfig.numPages || 1;
            scraperInstance.scrape(numPages).then(function(totals){
                res.send(totals);
            });
        });
    });
};
