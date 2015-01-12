var Q = require('q');
var cheerio = require('cheerio');
var request = require('request').defaults({
    jar: true
});

function requiredOptions(options){
    if(!options.account){
        throw new Error('account is required');
    }
    if(!options.username){
        throw new Error('username is required');
    }
    if(!options.password){
        throw new Error('password is required');
    }
    if(!options.accountId){
        throw new Error('accountId is required');
    }
}

function Scraper(options){
    this.host = options.account + '.breathehr.com'
    this.username = options.username;
    this.password = options.password;
    this.accountId = options.accountId;
}

Scraper.prototype.login = function login(cb){
    var host = this.host;
    var username = this.username;
    var password = this.password;
    var accountId = this.accountId;

    request('https://' + host + '/employees/sign_in', function(err, response, body){
        if(err){
            return cb(err);
        }
        var $ = cheerio.load(body);
        var token = $('input[name=authenticity_token]').val();
        if(!token){
            return cb(new Error('could not find authenticity_token'));
        }

        request.post('https://' + host + '/employees/sign_in', {
            form: {
                authenticity_token: token,
                employee: {
                    account_id: accountId,
                    email: username,
                    password: password
                }
            }
        }, function(err, response, body){
            if(err){
                return cb(err);
            }

            cb();
        });
    });
};

Scraper.prototype.scrape = function(numPages, cb){
    var deferred = Q.defer();
    var totalsPromises = [];

    for(var i = 1; i <= numPages; i++){
        totalsPromises.push(getTotalsForPage(this.host, i));
    }

    Q.all(totalsPromises).then(function(allPageTotals){
        var totals = allPageTotals.reduce(function(memo, pageTotals){
            Object.keys(pageTotals.received).forEach(function(recipient){
                if(!memo.received[recipient]){
                    memo.received[recipient] = {
                        value: 0,
                        from: []
                    };
                }
                memo.received[recipient].value += pageTotals.received[recipient].value;
                memo.received[recipient].from = memo.received[recipient].from.concat(pageTotals.received[recipient].from);
            });

            Object.keys(pageTotals.sent).forEach(function(sender){
                if(!memo.sent[sender]){
                    memo.sent[sender] = {
                        value: 0,
                        to: []
                    };
                }
                memo.sent[sender].value += pageTotals.sent[sender].value;
                memo.sent[sender].to = memo.sent[sender].to.concat(pageTotals.sent[sender].to);
            });

            return memo;
        },{
            received: {},
            sent: {},
            received_to_sent_ratio: {}
        });

        var totalNames = {};
        Object.keys(totals.received).concat(Object.keys(totals.sent)).forEach(function(name){
            totalNames[name] = true;
        });
        totalNames = Object.keys(totalNames);
        totalNames.forEach(function(name){
            if(!totals.received[name]){
                totals.received_to_sent_ratio[name] = 'none received';
                return;
            }
            if(!totals.sent[name]){
                totals.received_to_sent_ratio[name] = 'none sent';
                return;
            }
            totals.received_to_sent_ratio[name] = parseFloat((totals.received[name].value / totals.sent[name].value).toFixed(3));
        });

        deferred.resolve(totals);
    }).fail(function(err){
        console.log('err!', err);
        throw err;
    });

    return deferred.promise;
};

function getSender(raw){
    return raw.match(/kudos from\n(.*?)\n/)[1].trim();
}

function getTotalsForPage(host, pagenum){
    var deferred = Q.defer();

    getPage(host, pagenum, function(err, body){
        if(err){
            return deferred.reject(error);
        }

        var $ = cheerio.load(body);
        var totals = {
            received: {},
            sent: {}
        };
        var details = [];

        $('.kudos-details').each(function(){
            var $this = $(this);
            var recipient = $this.find('strong').text().trim();
            var sender = getSender($this.find('.smaller').text());

            if(!totals.received[recipient]){
                totals.received[recipient] = {
                    value: 0,
                    from: []
                };
            }
            if(!totals.sent[sender]){
                totals.sent[sender] = {
                    value: 0,
                    to: []
                };
            }
            totals.received[recipient].value++;
            totals.received[recipient].from.push(sender);
            totals.sent[sender].value++;
            totals.sent[sender].to.push(recipient);
        });

        deferred.resolve(totals);
    });

    return deferred.promise;
}

function getPage(host, pagenum, cb){
    console.log('request page', pagenum);
    request('https://' + host + '/employees/kudos?page=' + pagenum, function(err, response, body){
        if(err){
            console.log('ERROR page', pagenum);
            return cb(err);
        }
        console.log('got page', pagenum);
        return cb(null, body);
    });
};

function create(options, cb){
    requiredOptions(options || {});

    var instance = new Scraper({
        account: options.account,
        username: options.username,
        password: options.password
    });

    instance.login(function(err){
        if(err){
            throw err;
        }
        cb(instance);
    });
}

module.exports.create = create;
