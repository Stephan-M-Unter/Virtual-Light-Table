class Sidebar {
    constructor(controller){
        this.controller = controller;
        
        
    }
    
    _addFragment(id, name, img_url){
        let sidebar = this;
        let controller = this.controller;
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

        // interface buttons
        let delete_button = document.createElement('div');
        delete_button.setAttribute('class', 'fragment_list_button delete_button hidden');
        let goto_button = document.createElement('div');
        goto_button.setAttribute('class', 'fragment_list_button goto_button hidden');
        let details_button = document.createElement('div');
        details_button.setAttribute('class', 'fragment_list_button details_button hidden');

        // generating DOM structure
        fragment_thumb_wrapper.appendChild(fragment_thumb);
        fragment_wrapper.appendChild(fragment_thumb_wrapper);
        fragment_wrapper.appendChild(fragment_name);
        fragment_wrapper.appendChild(delete_button);
        fragment_wrapper.appendChild(goto_button);
        fragment_wrapper.appendChild(details_button);
        
        $("#fragment_list_content").append(fragment_wrapper);


        // Interactions
        fragment_wrapper.addEventListener('click', function(event){
            let isActive = $(this).hasClass('fragment_list_item_active');
            let isCtrl = event.ctrlKey;
            // let id = $(this).attr('id');

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
        fragment_wrapper.addEventListener('mouseenter', function(event){
            // let id = $(this).attr('id');
            controller.highlightFragment(id);
            sidebar.addFragmentListButtons(id);
        });
        fragment_wrapper.addEventListener('mouseleave', function(event){
            // let id = $(this).attr('id');
            controller.unhighlightFragment(id);
            if (!$(this).hasClass('fragment_list_item_active')) {
                sidebar.removeFragmentListButtons(id);
            }
        });


        delete_button.addEventListener('click', function(event){
            controller.removeFragment(id);
        }, false);
        goto_button.addEventListener('click', function(event){
            controller.centerToFragment(id);
        }, false);
        details_button.addEventListener('click', function(event){
        }, false);
    }

    updateFragmentList(fragmentList){
        $('#fragment_list_content').empty();

        if (!$.isEmptyObject(fragmentList)) {
            for (let id in fragmentList){
                this._addFragment(id, fragmentList[id].getName(), fragmentList[id].getImageURL());
            }
        } else {
            let no_fragments_text = document.createElement("div");
            no_fragments_text.setAttribute('id', 'fragment_list_nocontent');
            let text = document.createTextNode("No fragments selected");
            no_fragments_text.appendChild(text);
            $("#fragment_list_content").append(no_fragments_text);
        }
    }

    selectFragment(fragmentId){
        let wrapper = $('div[id="'+fragmentId+'"]');
        wrapper.addClass('fragment_list_item_active');
        this.addFragmentListButtons(fragmentId);
    }
    deselectFragment(fragmentId){
        let wrapper = $('div[id="'+fragmentId+'"]');
        wrapper.removeClass('fragment_list_item_active');
    }
    clearSelection(){
        $('.fragment_list_item_active').removeClass('fragment_list_item_active');
        $('.fragment_list_button').addClass('hidden');
    }

    highlightFragment(id){
        let wrapper = $('div[id="'+id+'"]');
        wrapper.addClass('fragment_list_item_highlighted');
    }
    unhighlightFragment(id) {
        let wrapper = $('div[id="'+id+'"]');
        wrapper.removeClass('fragment_list_item_highlighted');
    }
    
    addFragmentListButtons(id){
        let wrapper = $('div[id="'+id+'"]');
        $(wrapper).find(".delete_button").removeClass("hidden");
        $(wrapper).find(".goto_button").removeClass("hidden");
        $(wrapper).find(".details_button").removeClass("hidden");
    }
    removeFragmentListButtons(id){
        let wrapper = $('div[id="'+id+'"]');
        $(wrapper).find(".delete_button").addClass("hidden");
        $(wrapper).find(".details_button").addClass("hidden");
        $(wrapper).find(".goto_button").addClass("hidden");
    }
}

module.exports.Sidebar = Sidebar;