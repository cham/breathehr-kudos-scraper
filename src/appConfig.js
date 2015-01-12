var args = process.argv;
var config = {};
var flagHeads = {
    account: '--account=',
    username: '--username=',
    password: '--password=',
    accountId: '--accountId=',
    numPages: '--numPages='
};

args.forEach(function(arg){
    Object.keys(flagHeads).forEach(function(pattern){
        if(arg.indexOf(flagHeads[pattern]) === 0){
            config[pattern] = arg.replace(flagHeads[pattern], '');
        }
    });
});

module.exports = config;
