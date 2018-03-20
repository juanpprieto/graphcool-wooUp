
import { fromEvent, FunctionEvent } from 'graphcool-lib'

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


async function groupTotalsByPeriod(obj, timestamp, period) {
    return new Promise(function(resolve, reject){
        // console.log('obj',obj);
        // console.log('timestamp',timestamp);
        // console.log('period',period);
        let objPeriod = {};

        // Loop and sort orders by period + date
        for (let i = 0; i < obj.length; i++) {

            obj[i].date = Date.parse(obj[i][timestamp]);
            let curDate = new Date(obj[i]["dateCompleted"]);
            let split;
            let subSplit = 0;

            if( period == 'hours'){
                subSplit = ( curDate.getUTCHours() - 1 === -1 ) ? 0 : curDate.getUTCHours() - 1;
                //console.log('curDate.getUTCHours()', curDate.getUTCHours());
                split = curDate.getFullYear()+'-' + ("0" + (curDate.getMonth() + 1)).slice(-2) + '-'+curDate.getDate();
            } else if (period == 'days') {
                subSplit = curDate.getUTCDate() - 1;
                split = curDate.getFullYear()+'-' + ("0" + (curDate.getMonth() + 1)).slice(-2);

            } else if (period == 'weeks') {
                subSplit = curDate.getWeek(curDate);
                split = curDate.getFullYear();

            } else if (period == 'months') {
                subSplit = ("0" + (curDate.getMonth() + 1)).slice(-2);
                split = curDate.getFullYear();

            } else if (period == 'quarters') {
                subSplit = Math.floor((curDate.getMonth() + 3) / 3) -1;
                split = curDate.getFullYear();

            } else if (period == 'years') {
                split = curDate.getFullYear();
            } else {
             //   console.log('groupByTimePeriod: You have to set a period! hour | day | week | month | year');
            }

            // delete epoch date
            delete obj[i].date;

            // Convert to string
            subSplit = '' + subSplit;

            // init split array
            if(!objPeriod[split]){
                objPeriod[split] = [];
            }

            if(period == 'hours' && objPeriod[split]){
                if(objPeriod[split].length !== 24){
                    for (let x = 0; x < 24; x++ ){
                        if(!objPeriod[split][x]){
                            //only add hour object if not already added.
                            objPeriod[split][x] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0}
                        }
                    }
                }
            }

            if(period == 'days' && objPeriod[split]){
                let localSplit = new Date(obj[i]["dateCompleted"]);
                let month = localSplit.getMonth() + 1;
                let year = localSplit.getFullYear();

                let daysMonth = new Date(year, month, 0).getUTCDate();
                // console.log(year, month, daysMonth)
                if(objPeriod[split].length !== daysMonth){
                    for (let z = 0; z < daysMonth; z++ ){
                        if(!objPeriod[split][z]){
                            //only add day object if not already added.
                            objPeriod[split][z] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0};
                        }
                    }
                }
            }

            if(period == 'weeks' && objPeriod[split]){
                let weeksInY = getISOWeeks(curDate.getFullYear());
                // console.log('weeksInY', weeksInY);
                if(objPeriod[split].length !== weeksInY ){
                    for (let x = 0; x < weeksInY; x++ ){
                        if(!objPeriod[split][x]){
                            //only add day object if not already added.
                            objPeriod[split][x] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0}
                        }
                    }
                }
            }

            if(period == 'months' && objPeriod[split]){
                if(objPeriod[split].length !== 12){
                    let twoDigitMonth = '';
                    for (var x = 1; x < 12; x++ ){
                        if ( x < 10 ){
                            twoDigitMonth = "0" + x;
                        } else {
                            twoDigitMonth = x;
                        }
                        if(!objPeriod[split][twoDigitMonth]){
                            //only add day object if not already added.
                            objPeriod[split][twoDigitMonth] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0}
                        }
                    }
                }
            }

            if(period == 'quarters' && objPeriod[split]){
                if(objPeriod[split].length !== 5){
                    for (let x = 0; x < 4; x++ ){
                        if(!objPeriod[split][x]){
                            //only add day object if not already added.
                            objPeriod[split][x] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0}
                        }
                    }
                }
            }

            if(period == 'years' && objPeriod[split]){
                if(objPeriod[split]['total']){

                } else {
                    objPeriod[split] = { total: 0, orders: 0, orderAvg: 0, maxOrder: 0, minOrder: 0}
                }

            }

            if(period !== 'years'){
                objPeriod[split][subSplit]['total'] += obj[i].total;
                objPeriod[split][subSplit]['orders']++;
                objPeriod[split][subSplit]['minOrder'] = objPeriod[split][subSplit]['minOrder'] === 0 ? obj[i].total : (objPeriod[split][subSplit]['minOrder'] < obj[i].total ? objPeriod[split][subSplit]['minOrder'] : obj[i].total) || 0;
                objPeriod[split][subSplit]['maxOrder'] = objPeriod[split][subSplit]['maxOrder'] > obj[i].total ? objPeriod[split][subSplit]['maxOrder'] : obj[i].total || 0;
                objPeriod[split][subSplit]['orderAvg'] = objPeriod[split][subSplit]['total'] / objPeriod[split][subSplit]['orders'] || 0;
            } else {
                objPeriod[split]['total'] += obj[i].total;
                objPeriod[split]['orders']++;
                objPeriod[split]['orderAvg'] = objPeriod[split]['total'] / objPeriod[split]['orders'] || 0;
                objPeriod[split]['minOrder'] = objPeriod[split]['minOrder'] === 0 ? obj[i].total : (objPeriod[split]['minOrder'] < obj[i].total ? objPeriod[split]['minOrder'] : obj[i].total) || 0;
                objPeriod[split]['maxOrder'] = objPeriod[split]['maxOrder'] > obj[i].total ? objPeriod[split]['maxOrder'] : obj[i].total || 0;
            }
        }
        if(objPeriod){
            resolve(objPeriod);
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

        let diff = d2 - d1;

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
            periodHours: 0,
            periodCount: 0,
            periodTotal: 0
        };

        let periodHours = Math.abs(d2 - d1) / 36e5;

        response.periodHours = periodHours;

        if (debug) console.log('periodHours', periodHours);

        let period = {
            //t1: t1 + 'T00:00:00.000Z',
            t1: t1,
            t1_end: t1.replace(/00:00:00.000Z/i, '23:59:59.999Z'),
            t2: t2,
            t2_start: t2.replace(/23:59:59.999Z/i, '00:00:00.000Z') // reconvert it back
        };

        if (debug) console.log('period', period);

        let query = `query { aggg: allOrders(filter: { store: { id: "${nodeId}" }, dateCompleted_gte: "${period.t1}", dateCompleted_lte: "${period.t2}" }){id dateCompleted total }}`;
        if (showItems) {
            // Include order items
            query = `query { aggg: allOrders(filter: { store: { id: "${nodeId}" } dateCompleted_gte: "${period.t1}" dateCompleted_lte: "${period.t2}" }){id dateCompleted total items { name price quantity }}}`;
        }

        if( showItems && firstLast ){
            query = `query { aggg: allOrders(filter: { store: { id: "${nodeId}" } OR: [{ dateCompleted_gte: "${period.t1}", dateCompleted_lte: "${period.t1_end}" }, { dateCompleted_gte: "${period.t2_start}", dateCompleted_lte: "${period.t2}"}]}) { id dateCompleted total items { name price quantity }}}`;
        } else if ( !showItems && firstLast ) {
            query = `query { aggg: allOrders(filter: { store: { id: "${nodeId}" } OR: [{ dateCompleted_gte: "${period.t1}", dateCompleted_lte: "${period.t1_end}" }, { dateCompleted_gte: "${period.t2_start}", dateCompleted_lte: "${period.t2}"}]}) { id dateCompleted total }}`;
        }


        if (debug) console.log('query:', query);
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
                    //Got orders.
                    let periodCount = 0;
                    if (rawOrders) {
                        periodCount = rawOrders.length;
                    }
                    let periodTotal = 0;

                    // let periodAvgOrder = 0;
                    // let periodMaxOrder = 0;
                    // let periodMinOrder = 0;
                    // let periodCountAbove = 0;
                    // let periodCountBellow = 0;
                    // let periodCountAboveIds = [];
                    // let periodCountBellowIds = [];

                    /**
                    for (let i = 0; i < periodCount; i++) {
                        let order = result.aggg[i];
                        // Count
                        periodTotal += order.total;

                        // Max Order
                        if (periodMaxOrder < order.total) {
                            periodMaxOrder = order.total;
                        }
                        // Min Order
                        if (i == 0) {
                            periodMinOrder = order.total;
                        }
                        if (periodMinOrder > order.total) {
                            periodMinOrder = order.total;
                        }
                    }

                    if (periodCount > 0) {
                        periodAvgOrder = +((periodTotal / periodCount).toFixed(2));
                        for (let x = 0; x < periodCount; x++) {
                            // Count Above
                            let order = result.aggg[x];
                            if (order.total > periodAvgOrder) {
                                periodCountAbove++;
                                periodCountAboveIds.push(order.id)
                            } else {
                                periodCountBellow++;
                                periodCountBellowIds.push(order.id)
                            }
                        }
                    }

                     **/

                    response.periodCount = periodCount;
                    response.periodTotal = periodTotal;

                    if (debug) console.log('partial response: ', JSON.stringify(response));
                    if (debug) console.log('rawOrders.length', rawOrders.length);
                    // get user by id
                    if(rawOrders.length > 0) {
                        let periodOrders = groupTotalsByPeriod(rawOrders, `${dateProp}`, `${splitBy}`);

                        periodOrders.then(periodOrders => {
                            if (debug) console.log('periodOrders result:', JSON.stringify(periodOrders));
                            response.periodOrders = periodOrders;
                            response.message = 'Found orders';
                            // Done Send response.
                            if (debug) console.log('periodOrders Response: ', JSON.stringify(response));
                            return {
                                data: response,
                            }
                        });
                    } else {
                        response.message = 'No orders';
                        if (debug) console.log('response no rawOrders:', JSON.stringify(response));
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
                            periodHours: periodHours,
                            periodCount: 0,
                            periodTotal: 0
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

