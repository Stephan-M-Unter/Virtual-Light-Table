class Sidebar {
    constructor(controller){
        this.controller = controller;
    }

    _addFragment(id, name, img_url){
        // thumbnail wrapper
        let fragment_wrapper = document.createElement("div");
        fragment_wrapper.setAttribute('class', 'fragment_list_item');
        fragment_wrapper.setAttribute('id', id);

        // thumbnail description
        let fragment_name = document.createElement("div");
        fragment_name.setAttribute('class', 'fragment_list_item_name');
        let text = document.createTextNode(name);
        fragment_name.append(text);

        // thumbnail itself
        let fragment_thumb_wrapper = document.createElement('div');
        fragment_thumb_wrapper.setAttribute('class', 'fragment_list_item_thumbwrapper');

        let fragment_thumb = document.createElement("img");
        fragment_thumb.setAttribute('class', 'fragment_list_item_img');
        fragment_thumb.src = img_url;
        fragment_thumb_wrapper.appendChild(fragment_thumb);
        
        fragment_wrapper.appendChild(fragment_thumb_wrapper);
        fragment_wrapper.appendChild(fragment_name);
        
        $("#fragment_list_content").append(fragment_wrapper);

        let controller = this.controller;

        // Interactions
        fragment_wrapper.addEventListener('click', function(event){
            let isActive = $(this).hasClass('fragment_list_item_active');
            let isCtrl = event.ctrlKey;
            let id = $(this).attr('id');

            if (isCtrl) {
                if (isActive) {
                    // ctrl key pressed and item has already been selected -> deselect
                    controller.deselectFragment(id);
                } else {
                    // ctrl key is pressed and item was not selected -> select
                    controller.selectFragment(id);
                }
            } else {
                // in all cases, clear the selection list first
                    controller.clearSelection();
                // if element had NOT been selected before, select it now
                if (!isActive) {
                    controller.selectFragment(id);
                }
            }
        });
    }

    updateFragmentList(fragmentList){
        $('#fragment_list_content').empty();

        for (let id in fragmentList){
            this._addFragment(id, fragmentList[id].getName(), fragmentList[id].getImageURL());
        }
    }

    selectFragment(fragmentId){
        let wrapper = $('div[id="'+fragmentId+'"]');
        wrapper.addClass('fragment_list_item_active');
    }
    deselectFragment(fragmentId){
        let wrapper = $('div[id="'+fragmentId+'"]');
        wrapper.removeClass('fragment_list_item_active');
    }
    clearSelection(){
        $('.fragment_list_item_active').removeClass('fragment_list_item_active');
    }
}

module.exports.Sidebar = Sidebar;