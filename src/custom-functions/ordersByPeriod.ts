
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

let debug = false,

async function groupByTimePeriod(obj, timestamp, period) {
    return new Promise(function(resolve, reject){
        if (debug) console.log('obj', obj);
        if (debug) console.log('period', period);

        let objPeriod = {};

        // No subsplit for year.

        // Loop and sort orders by period + date
        for (let i = 0; i < obj.length; i++) {

            obj[i].date = Date.parse(obj[i][timestamp]);
            let curDate = new Date(obj[i][timestamp]);
            let split;
            //if (debug) console.log('dateCompleted', obj[i].dateCompleted)
            let subSplit = '';

            if( period == 'hour'){
                subSplit = curDate.getUTCHours() - 1;
                split = curDate.getFullYear()+'-' + (curDate.getMonth()+1) + '-'+curDate.getDate();

            } else if (period == 'day') {
                subSplit = curDate.getUTCDate() - 1;
                split = curDate.getFullYear()+'-' + (curDate.getMonth()+1);

            } else if (period == 'week') {
                subSplit = curDate.getWeek(curDate);
                split = curDate.getFullYear();

            } else if (period == 'month') {
                subSplit = curDate.getMonth();
                split = curDate.getFullYear();

            } else if (period == 'quarter') {
                subSplit = Math.floor((curDate.getMonth() + 3) / 3) - 1;
                split = curDate.getFullYear();

            } else if (period == 'year') {
                split = curDate.getFullYear();

            } else {
                if (debug) console.log('groupByTimePeriod: You have to set a period! hour | day | week | month | year');
            }

            // delete epoch date
            delete obj[i].date;

            // Convert to string
            subSplit = '' + subSplit;

            // init split array
            if(!objPeriod[split]){
                objPeriod[split] = [];
            }


            if(period == 'hour' && objPeriod[split]){
                if(objPeriod[split].length !== 24){
                    for (let x = 0; x < 24; x++ ){
                        objPeriod[split][x] = [];
                    }
                }
            }

            if(period == 'day' && objPeriod[split]){
                let localSplit = new Date(obj[i]['dateCompleted']);
                let month = localSplit.getMonth() + 1;
                let year = localSplit.getFullYear();

                let daysMonth = new Date(year, month, 0).getUTCDate();
                // if (debug) console.log(year, month, daysMonth)
                if(objPeriod[split].length !== daysMonth){
                    for (let x = 0; x < daysMonth; x++ ){
                        objPeriod[split][x] = [];
                    }
                }
            }

            if(period == 'week' && objPeriod[split]){
                let weeksInY = getISOWeeks(curDate.getFullYear());
                // if (debug) console.log('weeksInY', weeksInY);
                if(objPeriod[split].length !== weeksInY ){
                    for (let x = 0; x < weeksInY; x++ ){
                        objPeriod[split][x] = [];
                    }
                }
            }

            if(period == 'month' && objPeriod[split]){
                if(objPeriod[split].length !== 12){
                    for (let x = 0; x < 12; x++ ){
                        objPeriod[split][x] = [];
                    }
                }
            }

            if(period == 'quarter' && objPeriod[split]){
                if(objPeriod[split].length !== 4){
                    for (let x = 0; x < 4; x++ ){
                        objPeriod[split][x] = [];
                    }
                }
            }

            if(period !== 'year'){
                //assing new object
                objPeriod[split][subSplit] = objPeriod[split][subSplit] || [];
                objPeriod[split][subSplit].push(obj[i]);
            } else {
                //objPeriod[split] = objPeriod[split] || [];
                objPeriod[split].push(obj[i]);
            }
        }
        if(objPeriod){
            resolve(objPeriod);
        }else{
            reject(objPeriod);
        }

    })
} // End of var groupByTimePeriod(ordersArray, 'dateCompleted', 'quarter')

// interface Order {
//     id: string
// }

interface EventData {
    t1: string
    t2: string
    dateProp: string
    splitBy: string
    showItems: boolean
}

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

        let t1 = event.data.t1;
        let t2 = event.data.t2;
        // let storeId = event.data.storeId;

        let nodeId = "";
        if (event.context.auth) {
            if (debug) console.log('event.context.auth', event.context.auth);
            if (event.context.auth.typeName && event.context.auth.nodeId) {
                nodeId = event.context.auth.nodeId;
            }
        }


        let splitBy = event.data.splitBy;
        let dateProp = event.data.dateProp;
        let showItems = event.data.showItems;

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
            splitBy = "day";
        }

        if (!dateProp) {
            dateProp = "dateCompleted";
        }

        if (!showItems) {
            showItems = false;
        }



        // t2 Defaults to today.
        let now = new Date(new Date() - new Date().getTimezoneOffset() * 60 * 1000);

        if (!t2 || t2 === null) {
            t2 = now.toISOString();
        }

        let d1 = new Date(t1), // 10:09 to
            d2 = new Date(t2); // 10:20

        let diff = d2 - d1;


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
            t1: t1,
            t2: t2
        };

        let query = `query { aggg: allOrders(filter: { store: { id: "${nodeId}" }, dateCompleted_gte: "${period.t1}", dateCompleted_lte: "${period.t2}" }){id dateCompleted total }}`;
        if (showItems) {
            // Include order items
            query = `query { aggg: allOrders(filter: { store: { id: "${nodeId}" } dateCompleted_gte: "${period.t1}" dateCompleted_lte: "${period.t2}" }){id dateCompleted total items { name price quantity }}}`;
        }



        if (debug) console.log('query:', query);
        const client = fromEvent(event);
        // const onbehalfToken = await client.generateAuthToken(nodeId, 'User')
        const api = client.api('simple/v1', {token: event.context.auth.token});
        const result = await api.request(query)
            .then(result => {
                let rawOrders = result["aggg"];
                if (debug) console.log('result:', JSON.stringify(rawOrders));
                if (rawOrders) {
                    //Got orders.
                    let periodCount = 0;
                    if (rawOrders) {
                        periodCount = rawOrders.length;
                    }
                    let periodTotal = 0;
                    let periodAvgOrder = 0;
                    let periodMaxOrder = 0;
                    let periodMinOrder = 0;
                    let periodCountAbove = 0;
                    let periodCountBellow = 0;
                    let periodCountAboveIds = [];
                    let periodCountBellowIds = [];

                    for (let i = 0; i < periodCount; i++) {
                        let order = rawOrders[i];
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
                            let order = rawOrders[x];
                            if (order.total > periodAvgOrder) {
                                periodCountAbove++;
                                periodCountAboveIds.push(order.id)
                            } else {
                                periodCountBellow++;
                                periodCountBellowIds.push(order.id)
                            }
                        }
                    }

                    response.periodCount = periodCount;
                    response.periodTotal = periodTotal;

                    if (debug) console.log('partial response: ', JSON.stringify(response));
                    // get  by id

                    if(rawOrders.length > 0){
                        let periodOrders = groupByTimePeriod(rawOrders, `${dateProp}`, `${splitBy}`);

                        periodOrders.then(periodOrders => {
                            if (debug) console.log('periodOrders result:', JSON.stringify(periodOrders));

                            response.periodOrders = periodOrders;

                            // Done Send response.
                            if (debug) console.log('Final Response: ', JSON.stringify(response));
                            return {
                                data: response,
                            }
                        })
                    } else {
                        response.message = 'no orders';
                        return {
                            data: response,
                        }
                    }
                }  else {
                    //no data
                    if (debug) console.log('NO DATA....');
                    return {
                        error: "No orders found",
                        data: null
                    }
                }


            });

        response.message = 'orders';
        if (debug) console.log('response again:', JSON.stringify(response));
        return {
            data: response,
        }

    } catch (e) {
        return {
            error: "No orders found",
            data: null
        }
    }
}



    /**
    //return { error: 'Email Signup not configured correctly'};
    return api.request(query)
        .then(data => {
            return {data: {storeId: storeId }};
            if (debug) console.log(data);
            if( data ){


                // let periodOrders = data.aggg.count;
                // if (debug) console.log('dateProp',dateProp);
                let periodOrders = groupByTimePeriod(data.aggg, `${dateProp}`, `${splitBy}`);
                let periodTotal = 0;
                let periodAvgOrder = 0;
                let periodMaxOrder = 0;
                let periodMinOrder = 0;
                let periodCount = 0;

                if(data.aggg){
                    periodCount = data.aggg.length;
                }
                let periodCountAbove = 0;
                let periodCountBellow = 0;
                let periodCountAboveIds = [];
                let periodCountBellowIds = [];

                for (let i = 0; i < periodCount; i++) {
                    let order = data.aggg[i];
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


                if (periodCount > 0 ) {
                    periodAvgOrder = +((periodTotal/periodCount).toFixed(2));
                    for (let x = 0; x < periodCount; x++){
                        // Count Above
                        let order = data.aggg[x];
                        if ( order.total > periodAvgOrder ) {
                            periodCountAbove++;
                            periodCountAboveIds.push(order.id)
                        } else {
                            periodCountBellow++;
                            periodCountBellowIds.push(order.id)
                        }
                    }
                }

                return {
                    data: {
                        storeId,
                        periodOrders,
                        periodHours,
                        periodTotal,
                        periodCount
                    }
                }


            }
            else {
                //No data.
                return {
                    data: {
                        storeId,
                        periodOrders: 0,
                        periodHours: periodHours,
                        periodTotal: 0,
                        periodCount: 0
                    },
                    error: "No orders found"
                }
            }

        })
        .catch(err => {
            return {
                error: err
            }
        })
}
**/

function getISOWeeks(y) {
    let d,
        isLeap;

    d = new Date(y, 0, 1);
    isLeap = new Date(y, 1, 29).getMonth() === 1;

    //check for a Jan 1 that's a Thursday or a leap year that has a
    //Wednesday jan 1. Otherwise it's 52
    return d.getDay() === 4 || isLeap && d.getDay() === 3 ? 53 : 52
}

