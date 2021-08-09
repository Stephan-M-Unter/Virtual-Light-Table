const { MeasurementTool } = require("./MeasurementTool");

/**
 * TODO
 */
class Util {
  /**
     * TODO
     * @param {*} milliseconds
     * @return {*}
     */
  static convertTime(milliseconds) {
    const time = new Date(milliseconds);

    const year = time.getFullYear();
    const month = ((time.getMonth()+1) < 10 ? '0' : '') + (time.getMonth()+1);
    const day = (time.getDate() < 10 ? '0' : '') + time.getDate();

    const hour = time.getHours();
    const minute = (time.getMinutes() < 10 ? '0' : '') + time.getMinutes();
    const second = (time.getSeconds() < 10 ? '0' : '') + time.getSeconds();

    return day+'.'+month+'.'+year+', '+hour+':'+minute;
  }

  /**
   * 
   * @param {*} list1 
   * @param {*} list2 
   * @return {*}
   */
  static compareLists(list1, list2) {
    const onlyList1 = [];
    const onlyList2 = [];
    const intersection = [];

    list1.forEach((item) => {
      if (list2.includes(item)) {
        intersection.push(item);
      } else {
        onlyList1.push(item);
      }
    });

    list2.forEach((item) => {
      if (!intersection.includes(item)) onlyList2.push(item);
    });

    return {
      l1: onlyList1,
      intersection: intersection,
      l2: onlyList2,
    };
  }

  /**
   * 
   * @param {*} dict1 
   * @param {*} dict2 
   * @return {*}
   */
  static compareDicts(dict1, dict2) {
    return this.compareLists(Object.keys(dict1), Object.keys(dict2));
  }
}

module.exports.Util = Util;
