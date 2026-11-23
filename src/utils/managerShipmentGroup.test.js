import { managerShipmentGroup } from './managerShipmentGroup';
test.each([
 ['Delivered','delivered'], [' DELIVERED ','delivered'],
 ['Undelivered','other'], ['RTO Delivered','rto_delivered'],
 ['RTO In Transit','rto'], ['RTO Initiated','rto'],
 ['In Transit','in_transit'], ['OUT_FOR_DELIVERY','out_for_delivery'],
 ['Picked Up','in_transit'], ['Cancelled','other'], ['Not Available','other'],
])('groups %s without substring overlaps', (status, group) => {
 expect(managerShipmentGroup(status)).toBe(group);
});
