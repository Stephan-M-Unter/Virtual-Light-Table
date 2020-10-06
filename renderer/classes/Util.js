class Util {
    static convertTime(milliseconds) {
        let time = new Date(milliseconds);
    
        let year = time.getFullYear();
        let month = ((time.getMonth()+1) < 10 ? '0' : '') + (time.getMonth()+1);
        let day = (time.getDate() < 10 ? '0' : '') + time.getDate();
    
        let hour = time.getHours();
        let minute = (time.getMinutes() < 10 ? '0' : '') + time.getMinutes();
        let second = (time.getSeconds() < 10 ? '0' : '') + time.getSeconds();
    
        return day+"."+month+"."+year+", "+hour+":"+minute+":"+second;
    }
}

module.exports.Util = Util;