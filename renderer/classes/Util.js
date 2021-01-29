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

    return day+'.'+month+'.'+year+', '+hour+':'+minute+':'+second;
  }
}

module.exports.Util = Util;
