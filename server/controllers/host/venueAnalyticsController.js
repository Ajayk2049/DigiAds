const Order = require('../../models/Order');
const Menu = require('../../models/Menu');
const HostApplication = require('../../models/HostApplication');

class VenueAnalyticsController {
  /**
   * Get Venue Analytics (Food sales by time slot, revenue, table frequency)
   */
  async getVenueAnalytics(req, res) {
    try {
      const { days: daysParam, hostApplicationId } = req.query || {};
      const days = parseInt(daysParam || '0', 10);

      let hostApp = null;
      if (hostApplicationId) {
        hostApp = await HostApplication.findOne({ _id: hostApplicationId, userId: req.user.uid });
      }
      if (!hostApp) {
        hostApp = await HostApplication.findOne({ userId: req.user.uid, status: 'approved' }) ||
          await HostApplication.findOne({ userId: req.user.uid });
      }
      if (!hostApp) {
        return res.status(404).send({ success: false, message: 'Host venue application not found' });
      }

      let startDate = new Date();
      if (days === 0) {
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setDate(startDate.getDate() - days);
      }

      const orders = await Order.find({
        hostApplicationId: hostApp._id,
        createdAt: { $gte: startDate },
        $or: [
          { paymentStatus: 'completed' },
          { tableStatus: { $in: ['completed', 'completed_acked'] } }
        ],
        orderStatus: { $ne: 'cancelled' }
      }).limit(1000).lean();

      const menu = await Menu.findOne({ hostApplicationId: hostApp._id });
      const menuItemsMap = {};
      if (menu && menu.items) {
        menu.items.forEach(item => {
          menuItemsMap[item.itemId] = {
            name: item.name,
            price: item.price,
            category: item.category,
            imageUrl: item.imageUrl || ''
          };
        });
      }

      let totalRevenuePaise = 0;
      let totalCompletedOrders = 0;

      const slotSales = {
        all: { itemCounts: {}, totalRevenue: 0, orderCount: 0 },
        breakfast: { itemCounts: {}, totalRevenue: 0, orderCount: 0 },
        lunch: { itemCounts: {}, totalRevenue: 0, orderCount: 0 },
        dinner: { itemCounts: {}, totalRevenue: 0, orderCount: 0 }
      };

      const tableFrequency = {};

      orders.forEach(order => {
        if (order.tableStatus === 'cancelled' || order.orderStatus === 'cancelled') return;
        const isFinishedBilling = order.paymentStatus === 'completed' || order.tableStatus === 'completed' || order.tableStatus === 'completed_acked';
        if (!isFinishedBilling) return;

        const isEmpty = (!order.items || order.items.length === 0) && (order.totalAmount || 0) === 0;
        if (isEmpty) return;

        totalRevenuePaise += (order.totalAmount || 0);
        totalCompletedOrders += 1;

        const tbl = order.tableNumber || 'Table N/A';
        if (!tableFrequency[tbl]) {
          tableFrequency[tbl] = { tableNumber: tbl, orderCount: 0, totalAmount: 0 };
        }
        tableFrequency[tbl].orderCount += 1;
        tableFrequency[tbl].totalAmount += (order.totalAmount || 0);

        const orderHour = new Date(order.createdAt).getHours();
        let slotKey = null;
        if (orderHour >= 8 && orderHour < 12) {
          slotKey = 'breakfast';
        } else if (orderHour >= 13 && orderHour < 16) {
          slotKey = 'lunch';
        } else if (orderHour >= 17 && orderHour < 23) {
          slotKey = 'dinner';
        }

        if (order.items && order.items.length > 0) {
          order.items.forEach(it => {
            const itemId = it.itemId;
            const qty = it.quantity || 1;
            const itemPricePaise = it.price || (menuItemsMap[itemId]?.price) || 0;
            const itemRev = itemPricePaise * qty;

            if (!slotSales.all.itemCounts[itemId]) {
              slotSales.all.itemCounts[itemId] = { itemId, name: it.name || menuItemsMap[itemId]?.name || itemId, qty: 0, revenuePaise: 0, imageUrl: menuItemsMap[itemId]?.imageUrl || '' };
            }
            slotSales.all.itemCounts[itemId].qty += qty;
            slotSales.all.itemCounts[itemId].revenuePaise += itemRev;
            slotSales.all.totalRevenue += itemRev;

            if (slotKey) {
              if (!slotSales[slotKey].itemCounts[itemId]) {
                slotSales[slotKey].itemCounts[itemId] = { itemId, name: it.name || menuItemsMap[itemId]?.name || itemId, qty: 0, revenuePaise: 0, imageUrl: menuItemsMap[itemId]?.imageUrl || '' };
              }
              slotSales[slotKey].itemCounts[itemId].qty += qty;
              slotSales[slotKey].itemCounts[itemId].revenuePaise += itemRev;
              slotSales[slotKey].totalRevenue += itemRev;
            }
          });
        }
        if (slotKey) {
          slotSales[slotKey].orderCount += 1;
        }
        slotSales.all.orderCount += 1;
      });

      const formatSlotData = (slotObj) => {
        const itemsArr = Object.values(slotObj.itemCounts);
        itemsArr.sort((a, b) => b.qty - a.qty);
        const topSeller = itemsArr[0] || null;
        const maxQty = topSeller ? topSeller.qty : 1;

        const rankedItems = itemsArr.slice(0, 3).map(item => ({
          ...item,
          percentageShare: Math.round((item.qty / maxQty) * 100)
        }));

        return {
          totalRevenuePaise: slotObj.totalRevenue,
          orderCount: slotObj.orderCount,
          topSeller,
          rankedItems
        };
      };

      let peakSlotName = '--';
      let maxSlotRev = 0;

      if (totalCompletedOrders > 0 && totalRevenuePaise > 0) {
        if (slotSales.breakfast.totalRevenue > maxSlotRev) {
          peakSlotName = 'Breakfast';
          maxSlotRev = slotSales.breakfast.totalRevenue;
        }
        if (slotSales.lunch.totalRevenue > maxSlotRev) {
          peakSlotName = 'Lunch';
          maxSlotRev = slotSales.lunch.totalRevenue;
        }
        if (slotSales.dinner.totalRevenue > maxSlotRev) {
          peakSlotName = 'Dinner';
          maxSlotRev = slotSales.dinner.totalRevenue;
        }
      }

      const tablesArr = Object.values(tableFrequency);
      tablesArr.sort((a, b) => b.orderCount - a.orderCount);

      const mostActiveTable = tablesArr[0] || null;
      const leastActiveTable = tablesArr.length > 1 ? tablesArr[tablesArr.length - 1] : null;

      return res.status(200).send({
        success: true,
        data: {
          days,
          venueName: hostApp.outletName,
          summary: {
            totalRevenuePaise,
            totalCompletedOrders,
            avgOrderValuePaise: totalCompletedOrders > 0 ? Math.round(totalRevenuePaise / totalCompletedOrders) : 0,
            peakSlotName
          },
          slots: {
            all: formatSlotData(slotSales.all),
            breakfast: formatSlotData(slotSales.breakfast),
            lunch: formatSlotData(slotSales.lunch),
            dinner: formatSlotData(slotSales.dinner)
          },
          tables: {
            mostActiveTable,
            leastActiveTable,
            totalActiveTables: tablesArr.length
          }
        }
      });
    } catch (error) {
      req.log.error({ err: error }, 'getVenueAnalytics Error');
      return res.status(500).send({ success: false, message: 'Failed to generate venue analytics' });
    }
  }
}

module.exports = new VenueAnalyticsController();
