'use latest'
const { fromEvent } = require('graphcool-lib')

const projectId = 'cjdp6c1no2fom0196xp61fz7w'
module.exports = (event) => {
    let passedid = event.data.oid;
    let _storeId = event.data.sId;


    const query = `query { storeHasOrder: allOrders(filter: { store: { id: "${_storeId}" } orderId: ${passedid}}) {id total } }`;

    console.log(query)

    /** Response Example

     {
     "data": {
       "storeHasOrder": {
         "storeId": "cjegq9q6g22bk01608a622gn2",
         "wooupUrl": "https://profundly.dev/",
         "foundOrder": [
           {
             "id": "cjegrnim52ih00159pd7kk1z1",
             "orderId": 17659
           }
         ]
       }
     }
   }

     **/

    const api = fromEvent(event).api('simple/v1');

    return api.request(query)
        .then(data => {
            console.log(data)
            let isStored = false;
            const orderId = passedid;
            let gcoolorderId = null;

            if(data.storeHasOrder.length > 0) {

                gcoolorderId = data.storeHasOrder[0].id;
                isStored = true;
                console.log('Order already stored')

                return {
                    data: {
                        isStored,
                        orderId,
                        id: gcoolorderId
                    }
                }
            } else {
                console.log('Order not in db')

                return {
                    data: {
                        isStored,
                        orderId,
                        id: gcoolorderId
                    }
                }
            }
        })
        .catch(err => {
            return {
                error: err
            }
        })
}
