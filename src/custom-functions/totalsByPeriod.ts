
import { fromEvent, FunctionEvent } from 'graphcool-lib'
import * as moment from 'moment';


interface Date {
    getWeek(d: Date): string;
}

Date.prototype.getWeek = function (d) {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    // Get first day of year
    let yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    // Calculate full weeks to nearest Thursday
    // Return array of year and week number
    return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
};
let weekAndDays = function (orderDateString) {
    //console.log('orderDateString',orderDateString);
    let orderDate = moment(orderDateString);
    //console.log('orderDate',orderDate);
    let orderYear = orderDate.format('YYYY');
    let orderDay = orderDate.format('DD');
    //console.log('orderDay',orderDay);
    let orderWeek = orderDate.format('ww');
    let orderYearWeek = orderYear + '-' + orderWeek; // 2018-51
    //console.log('orderYearWeek', orderYearWeek);
    let orderWeekDays = [];
    for (var day = 0; day < 7; day++){
        orderWeekDays.push(orderDate.startOf('week').add(day, 'days').format('DD').substring(0, 2));
    }
    // console.log('orderWeekDays',orderWeekDays);
    let orderWeekday = orderWeekDays.indexOf(orderDay); // '0-7' based on days of this week i.e 19-25;
    //console.log({split: orderSplit, subSplit: orderSubSplit });
    if(orderWeekday > 6) {
        // shouldnt get here but it means it couldnt match the day to the current week
        orderWeekday = 7; //set order weekday it as a 8th day of the week..
    }
    return {split: orderYearWeek, subSplit: orderWeekday }; // 2018-51 > 0..7 , 2017-52> 0...7
}

async function groupTotalsByPeriod(rawOrders: any, timestamp: string, period: string, showItems: boolean) {
    return new Promise(function(resolve, reject){
        // console.log('rawOrders',rawOrders);
        // console.log('timestamp',timestamp);
        // console.log('period',period);
        // if ( debug ) console.log('showItems............. : ', showItems);
        // let objPeriod = {};
        var periods = {
            count: 0, splits: []
        };
        var periodOrders = {};
        var periodCounts = {};
        var periodSalesTotals = {};

        // Loop and sort orders by period + date
        for (var i = 0; i < rawOrders.length; i++) {


            rawOrders[i].date = Date.parse(rawOrders[i][timestamp]);
            var curDate = new Date(rawOrders[i].dateCompleted);
            var split;
            //console.log('dateCompleted', rawOrders[i].dateCompleted)
            var subSplit = 0;

            if( period == 'hours'){
                subSplit = ( curDate.getUTCHours() - 1 === -1 ) ? 0 : curDate.getUTCHours() - 1;
                // console.log('curDate.getUTCHours()', curDate.getUTCHours());
                split = curDate.getFullYear()+'-' + ("0" + (curDate.getMonth() + 1)).slice(-2) + '-'+curDate.getDate();

            } else if (period == 'days') {
                subSplit = curDate.getUTCDate() - 1;
                split = curDate.getFullYear()+'-' + ("0" + (curDate.getMonth() + 1)).slice(-2);

            } else if (period == 'weeksYear') {
                subSplit = curDate.getWeek(curDate);
                split = curDate.getFullYear();

            } else if (period == 'weeksDays') {
                // Using momentjs based formula
                let orderSplits = weekAndDays(rawOrders[i].dateCompleted);
                split = orderSplits.split;
                subSplit = orderSplits.subSplit;

            } else if (period == 'months') {

                subSplit = curDate.getMonth();
                //console.log(subSplit)
                // console.log(subSplit)
                split = curDate.getFullYear();

            } else if (period == 'quarters') {
                subSplit = Math.floor((curDate.getMonth() + 3) / 3) -1;
                split = curDate.getFullYear();

            } else if (period == 'years') {
                split = curDate.getFullYear();
            } else {
                // console.log('groupByTimePeriod: You have to set a period! hours | days | weeks | month | year');
            }

            // Store periods
            if(periods.splits.indexOf(split) === -1 ) {
                // add split if not already added
                periods.splits.push(split);
            }


            // delete epoch date
            delete rawOrders[i].date;

            // Convert to string
            subSplit = '' + subSplit;

            // init split array
            if ( !periodOrders[split] ) {

                periodOrders[split] = [];

                periodCounts[split] = {
                    change: 0.00,
                    change_value: 0.00,
                    total: 0
                };

                periodSalesTotals[split] = {
                    change: 0.00,
                    change_value: 0.00,
                    total: 0
                };
            }


            if(period == 'hours' && periodOrders[split]){
                if(periodOrders[split].length !== 24){
                    for (var x = 0; x < 24; x++ ){
                        if(!periodOrders[split][x]){
                            //only add hour object if not already added.
                            periodOrders[split][x] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0, list:[]};
                        }
                    }
                }
            }

            if(period == 'days' && periodOrders[split]){
                var localsplit = new Date(rawOrders[i].dateCompleted);
                var month = localsplit.getMonth() + 1;
                var year = localsplit.getFullYear();

                var daysMonth = new Date(year, month, 0).getUTCDate();
                // console.log(year, month, daysMonth)
                if(periodOrders[split].length !== daysMonth){
                    for (var x = 0; x < daysMonth; x++ ){
                        if(!periodOrders[split][x]){
                            //only add day object if not already added.
                            periodOrders[split][x] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0, list:[]};
                        }

                    }
                }

            }

            if(period == 'weeksYear' && periodOrders[split]){
                var weeksInY = getISOWeeks(curDate.getFullYear());
                // console.log('weeksInY', weeksInY);
                if(periodOrders[split].length !== weeksInY ){
                    for (var x = 0; x < weeksInY; x++ ){
                        if(!periodOrders[split][x]){
                            //only add day object if not already added.
                            periodOrders[split][x] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0, list:[]};;
                        }
                    }
                }
            }
            if(period == 'weeksDays' && periodOrders[split]){

                if(periodOrders[split].length !== 7){
                    for (var x = 0; x < 7; x++ ){
                        if(!periodOrders[split][x]){
                            //only add day object if not already added.
                            //console.log(weekDays[x])
                            periodOrders[split][x] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0, list:[]};
                        }

                    }
                }

            }

            if(period == 'months' && periodOrders[split]){
                if(periodOrders[split].length !== 12){

                    for(var x = 0; x < 12; x++ ) {
                        if(!periodOrders[split][x]) {
                            //only add day object if not already added.
                            periodOrders[split][x] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0, list:[]};;
                        }
                    }
                }
            }

            if(period == 'quarters' && periodOrders[split]){
                if(periodOrders[split].length !== 5){
                    for (var x = 0; x < 4; x++ ){
                        if(!periodOrders[split][x]){
                            //only add day object if not already added.
                            periodOrders[split][x] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0, list:[]};
                        }
                    }
                }
            }

            if(period == 'years' && periodOrders[split]){
                if(periodOrders[split]['total']){

                } else {
                    periodOrders[split] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0, list:[]};
                }

            }

            if(period !== 'years'){
                // console.log('rawOrders[i]', JSON.stringify(rawOrders[i]));
                // console.log('subSplit', subSplit);
                // console.log('split', split);
                // console.log('periodOrders[split][subSplit]', JSON.stringify(periodOrders[split][subSplit]));

                periodOrders[split][subSplit]['total'] += rawOrders[i].total;
                periodOrders[split][subSplit]['orders']++;
                periodOrders[split][subSplit]['minOrder'] = periodOrders[split][subSplit]['minOrder'] === 0 ? rawOrders[i].total : (periodOrders[split][subSplit]['minOrder'] < rawOrders[i].total ? periodOrders[split][subSplit]['minOrder'] : rawOrders[i].total) || 0;
                periodOrders[split][subSplit]['maxOrder'] = periodOrders[split][subSplit]['maxOrder'] > rawOrders[i].total ? periodOrders[split][subSplit]['maxOrder'] : rawOrders[i].total || 0;
                periodOrders[split][subSplit]['orderAvg'] = periodOrders[split][subSplit]['total'] / periodOrders[split][subSplit]['orders'] || 0;
                if( showItems)  periodOrders[split][subSplit]['list'].push(rawOrders[i]);
                // periodCounts
                periodCounts[split]['total']++;

                // periodSalesTotals
                periodSalesTotals[split]['total'] += rawOrders[i].total;


            } else {
                periodOrders[split]['total'] += rawOrders[i].total;
                periodOrders[split]['orders']++;
                periodOrders[split]['orderAvg'] = periodOrders[split]['total'] / periodOrders[split]['orders'] || 0;
                periodOrders[split]['minOrder'] = periodOrders[split]['minOrder'] === 0 ? rawOrders[i].total : (periodOrders[split]['minOrder'] < rawOrders[i].total ? periodOrders[split]['minOrder'] : rawOrders[i].total) || 0;
                periodOrders[split]['maxOrder'] = periodOrders[split]['maxOrder'] > rawOrders[i].total ? periodOrders[split]['maxOrder'] : rawOrders[i].total || 0
                if( showItems) periodOrders[split]['list'].push(rawOrders[i]);
                // periodCounts
                periodCounts[split]['total']++;

                // periodSalesTotals
                periodSalesTotals[split]['total'] += rawOrders[i].total;
            }

        } // end for


        // number of periods
        periods.count = periods.splits.length;
        // sort periods from more recent to less
        periods.sortedSplits = periods.splits.sort(function(a, b) { return a < b; });
        // most recent period
        periods.to = periods.sortedSplits[0];
        // less recent period
        periods.from = periods.sortedSplits[periods.splits.length - 1];
        // console.log('periods: ', periods);

        // Calculate percentage change between periods. Only assign it to the most recent as it's the target comparissson.
        if(Object.keys(periodCounts).length > 1){
            // Only assign it to the most recent as it's the target comparisson.
            // change percentage
            periodCounts[periods.to].change = ((periodCounts[periods.to].total - periodCounts[periods.from].total ) / periodCounts[periods.from].total * 100).toFixed(2);
            // change ammount
            periodCounts[periods.to].change_value = periodCounts[periods.to].total - periodCounts[periods.from].total;
            // don't need change here as I'm not comparing into this (old period)
            delete periodCounts[periods.from].change;
            delete periodCounts[periods.from].change_value;
        }

        if(Object.keys(periodSalesTotals).length > 1){
            // Only assign it to the most recent as it's the target comparisson.
            periodSalesTotals[periods.to].change = ((periodSalesTotals[periods.to].total - periodSalesTotals[periods.from].total ) / periodSalesTotals[periods.from].total * 100).toFixed(2);
            periodSalesTotals[periods.to].change_value = periodSalesTotals[periods.to].total - periodSalesTotals[periods.from].total;
            delete periodSalesTotals[periods.from].change;
            delete periodSalesTotals[periods.from].change_value;
        }

        let totalCount = periodCounts[periods.to].total + periodCounts[periods.from].total;
        let totalSales = periodSalesTotals[periods.to].total + periodSalesTotals[periods.from].total;


        if(periodOrders){
            resolve({ totalCount: totalCount, totalSales: totalSales, periodOrders: periodOrders, periodCounts: periodCounts, periodSales: periodSalesTotals, periods:periods});
        } else {
            reject({error: { message: "error sorting"}});
        }
    });
}


// interface User {
//     id: string
// }

interface EventData {
    email: string
    storeId: string
    t1: string
    t2: string
    dateProp: string
    splitBy: string
    showItems: boolean
}


let debug = false;

export default async (event: FunctionEvent<EventData>) => {

    try {

        let clusterUrl = event['context']['graphcool']['endpoints'].simple;

        if (clusterUrl) {
            if(clusterUrl.indexOf(':') !== -1) {
                // Local cluster
                debug = false;
            }
        }


        let inpuErrors = "";
        if (!event.data.t1) {
            inpuErrors += "Must provide t1 parameter";
        }
        if (!event.data.t2) {
            inpuErrors += "Must provide t2 parameter";
        }
        if (!event.data.splitBy) {
            inpuErrors += "Must provide splitBy parameter";
        }
        if (event.data.showItems === null || event.data.showItems === undefined) {
            inpuErrors += "Must provide showItems parameter";
        }

        //display input errors
        if (inpuErrors !== "") {
            return {error: {message: inpuErrors, code: 200, count: inpuErrors.length}};
        }

        let { t1, t2, splitBy, dateProp, showItems, firstLast } = event.data;
        //let t1 = event.data.t1;
        //let t2 = event.data.t2;


        let nodeId = "";
        if (event.context.auth) {
            if (debug) console.log('event.context.auth', event.context.auth);
            if (event.context.auth.typeName && event.context.auth.nodeId) {
                nodeId = event.context.auth.nodeId;
            }
        }


        // let splitBy = event.data.splitBy;
        // let dateProp = event.data.dateProp;
        // let showItems = event.data.showItems;

        if (!t1) {
            t1 = "2018-02-01T00:37:38.000Z";
            t2 = "2018-04-01T00:37:38.000Z";
        }
        /**
         if(!storeId){
        storeId = "cjegq9q6g22bk01608a622gn2";
    }
         **/
        if (!splitBy) {
            if (debug) console.log('here');
            splitBy = "days";
        }

        if (!dateProp) {
            dateProp = "dateCompleted";
        }

        if (!showItems) {
            showItems = false;
        }

        if (!firstLast) {
            firstLast = false;
        }

        // Test
        let startOfTheWeek = moment().startOf('week').add(1, 'days').format('DD').substring(0, 2);

        // t2 Defaults to today.
        let now = new Date(new Date() - new Date().getTimezoneOffset() * 60 * 1000);

        if (!t2 || t2 === null) {
            t2 = now.toISOString();
        } else {
            // have t2 -> set the limit to T23:59:59:59.999Z
            t2 = t2.replace(/00:00:00.000Z/i, '23:59:59.999Z');
        }

        let d1 = new Date(t1), // 10:09 to
            d2 = new Date(t2); // 10:20


        // if (diff > 60e3) {
        //     console.log(Math.floor(diff / 60e3), 'minutes ago');
        // }
        // else {
        //     console.log(Math.floor(diff / 1e3), 'seconds ago');
        // }
        // default response

        let response = {
            message: '',
            store_id: nodeId,
            periodOrders: {},
            periodSales: {},
            periodCounts: {},
            periods: {},
            periodHours: Math.abs(d2 - d1) / 36e5,
            totalCount: 0,
            totalSales: 0,
        };

        if (debug) console.log('response.periodHours', response.periodHours);

        let period = {
            //t1: t1 + 'T00:00:00.000Z',
            t1: t1,
            t1_end: t1.replace(/00:00:00.000Z/i, '23:59:59.999Z'),
            t2: t2,
            t2_start: t2.replace(/23:59:59.999Z/i, '00:00:00.000Z') // reconvert it back
        };

        if (debug) console.log('period', period);


        let firstLastQ = `filter: { 
                              store: { id: "${nodeId}" } 
                              OR: [
                                { dateCompleted_gte: "${period.t1}", dateCompleted_lte: "${period.t1_end}" }, 
                                { dateCompleted_gte: "${period.t2_start}", dateCompleted_lte: "${period.t2}"}
                              ]
                          }`;

        let stdQ = `filter: { store: { id: "${nodeId}" }, dateCompleted_gte: "${period.t1}", dateCompleted_lte: "${period.t2}" }`;
        let filterQ;

        let showItemsQ = '';

        if ( firstLast ){
            filterQ = firstLastQ;
        } else {
            filterQ = stdQ;
        }

        if ( showItems ){
            showItemsQ = 'items { id name price quantity }';
        } else {
            showItemsQ = '';
        }

        let query = `query { aggg: allOrders( ${filterQ} ){ id dateCompleted total status ${showItemsQ} }}`;

        if (debug) console.log('query:', query);
        // let periodCount = 0;
        // let periodTotal = 0;
        const client = fromEvent(event);
        // const onbehalfToken = await client.generateAuthToken(nodeId, 'User')
        const api = client.api('simple/v1', {token: event.context.auth.token});
        const result = await api.request(query)
            .then(result => {
                // if (debug) console.log('result:', JSON.stringify(result));
                if(result){
                    response.message = JSON.stringify(result);
                }

                let rawOrders = result["aggg"];
                if (rawOrders) {


                    if (debug) console.log('rawOrders: ', JSON.stringify(rawOrders));
                    if (debug) console.log('rawOrders.length', rawOrders.length);
                    // get user by id
                    if(rawOrders.length > 0) {
                        let totalsPeriods = groupTotalsByPeriod(rawOrders, `${dateProp}`, `${splitBy}`, showItems);

                        totalsPeriods.then(totalsPeriods => {
                            if (debug) console.log('totalsPeriods.periodOrders result:', JSON.stringify(totalsPeriods.periodOrders));
                            response.totalCount = totalsPeriods.totalCount;
                            response.totalSales = totalsPeriods.totalSales;
                            response.periodOrders = totalsPeriods.periodOrders;
                            response.periodCounts = totalsPeriods.periodCounts;
                            response.periodSales = totalsPeriods.periodSales;
                            response.periods = totalsPeriods.periods;
                            response.message = 'Found orders';
                            // Done Send response.
                            if (debug) console.log('totalsPeriods Response: ', JSON.stringify(response));
                            return {
                                data: response,
                            }
                        });
                    } else {
                        response.message = 'No orders';
                        if (debug) console.log('totalsPeriods response no rawOrders:', JSON.stringify(response));
                        // return {
                        //     data: response,
                        // }
                    }

                }
                else {
                    //no data
                    if (debug) console.log('NO DATA....');
                    return {
                        error: "No orders found",
                        data: {
                            storeId: nodeId,
                            periodOrders: {},
                            periodHours: response.periodHours,
                            periodCounts: {},
                            periods: {},
                            totalCount: {},
                            totalSales: {},
                            periodSales: {}
                        }
                    }
                }

            });
        // response.message = 'orders';
        if (debug) console.log('final  again:', JSON.stringify(response));
        return {
            data: response,
        }
    } catch (e) {
        // Error Response.
        return {
            error: "No orders found",
            data: null
        }
    }
}


function getISOWeeks(y) {
    let d,
        isLeap;

    d = new Date(y, 0, 1);
    isLeap = new Date(y, 1, 29).getMonth() === 1;

    //check for a Jan 1 that's a Thursday or a leap year that has a
    //Wednesday jan 1. Otherwise it's 52
    return d.getDay() === 4 || isLeap && d.getDay() === 3 ? 53 : 52;
}