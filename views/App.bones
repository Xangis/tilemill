Bones.utils.until = function(url, callback) {
    $.ajax({
        url: url,
        success: callback,
        error: function() { setTimeout(function() {
            Bones.utils.until(url, callback);
        }, 500); }
    });
};

view = Backbone.View.extend();

view.prototype.events = {
    'click .bleed a': 'unload',
    'click #popup a[href=#close], #popup input.cancel': 'popupClose',
    'click a.popup': 'popupOpen',
    'click #drawer a[href=#close]': 'drawerClose',
    'click a.drawer': 'drawerOpen',
    'click .button.dropdown, .button.dropdown a': 'dropdown',
    'click .toggler a': 'toggler',
    'click a.restart': 'restart',
    'keydown': 'keydown'
};

view.prototype.initialize = function() {
    _(this).bindAll(
        'unload',
        'popupOpen',
        'popupClose',
        'drawerOpen',
        'drawerClose',
        'toggler',
        'keydown',
        'dropdown'
    );
};

view.prototype.unload = function() {
    return !window.onbeforeunload || window.onbeforeunload() !== false;
};

view.prototype.popupOpen = function(ev) {
    var target = $(ev.currentTarget);
    var title = target.attr('title') || target.text();

    $(this.el).addClass('overlay');
    this.$('#popup').addClass('active');
    this.$('#popup > .title').text(title);
    return false;
};

view.prototype.popupClose = function(ev) {
    $(this.el).removeClass('overlay');
    this.$('#popup')
        .removeClass('active')
        .html(templates.Pane());
    return false;
};

view.prototype.drawerOpen = function(ev) {
    var target = $(ev.currentTarget);

    // Close drawers when the target is active.
    if (target.is('.active')) return this.drawerClose();

    var title = target.text() || target.attr('title');
    this.$('a.drawer.active').removeClass('active');
    target.addClass('active');
    this.$('#drawer')[target.hasClass('mini') ? 'addClass' : 'removeClass']('mini');
    this.$('#drawer').addClass('active')
    this.$('#drawer > .title').text(title);
    return false;
};

view.prototype.drawerClose = function(ev) {
    this.$('a.drawer.active').removeClass('active');
    this.$('#drawer')
        .removeClass('active')
        .html(templates.Pane());
    return false;
};

view.prototype.toggler = function(ev) {
    var link = $(ev.currentTarget);
    var parent = link.parents('.toggler');
    var target = link.attr('href').split('#').pop();
    if (link.hasClass('disabled')) return false;

    $('a', parent).removeClass('active');
    this.$('.' + target).siblings('.active').removeClass('active');

    link.addClass('active');
    this.$('.' + target).addClass('active');
    return false;
};

view.prototype.keydown = function(ev) {
    // Escape
    if (ev.which == 27 && (!ev.ctrlKey && !ev.metaKey && !ev.altKey)) {
        // @TODO for some reason a function bound from the Modal view
        // to a keydown event is not fired. Probably related to
        // event delegation/bubbling?
        if (this.$('#modal.active').size()) {
            if (!$('#popup.active').size()) $('body').removeClass('overlay');
            this.$('#modal.active').removeClass('active');
        } else if (this.$('#popup.active').size()) {
            this.popupClose();
        } else if (this.$('#drawer.active').size()) {
            this.drawerClose();
        }
        return false;
    }
    // Ctrl + S
    // The keydown event is only passed to a specific view if an form
    // element in that view has focus. When no form element has focus
    // the top most view takes precedence and the event is *not* bubbled
    // down (http://api.jquery.com/keydown). This code conceptually belongs
    // in `Project.bones` but is handled here as the App is the one to
    // receive the event.
    if (ev.which == 83 &&
        ((ev.ctrlKey || ev.metaKey) && !ev.altKey)) {
        this.$('.actions a[href=#save]').click();
        return false;
    }
};

view.prototype.dropdown = function(ev) {
    var target = $(ev.currentTarget);
    if (!target.is('.dropdown')) target = target.parents('.button.dropdown');
    var app = this.el;
    if (!target.hasClass('active')) {
        target.addClass('active');
        $(app).bind('click', collapse);
    }
    function collapse(ev) {
        target.removeClass('active');
        $(app).unbind('click', collapse);
    }

    return false;
};

view.prototype.restart = function(ev) {
    var target = $(ev.currentTarget);
    var parent = target.parents('.restartable');
    if (parent.hasClass('restarting')) return false;

    target.addClass('active');
    parent.addClass('restarting');
    $.ajax({
        url: 'http://'+window.abilities.tileUrl+'/restart',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({'bones.token':Backbone.csrf('/restart')}),
        dataType: 'json',
        processData: false,
        success: function() {
            Bones.utils.until('http://'+window.abilities.tileUrl+'/status', function() {
                target.removeClass('active');
                parent
                    .removeClass('loading')
                    .removeClass('restarting')
                    .removeClass('restartable');
                if (parent.is('#drawer')) $('a[href=#close]',parent).click();
            });
        },
        error: function(err) {
            target.removeClass('active');
            parent
                .removeClass('loading')
                .removeClass('restarting')
                .removeClass('restartable');
            if (parent.is('#drawer')) $('a[href=#close]',parent).click();
            new views.Modal(err);
        }
    });
    return false;
};

