/*
* Infor Tree Control.
*
* Modified and Trimmed version of jsTree 1.0-rc3
* http://jstree.com/
*
* Copyright (c) 2010 Ivan Bozhanov (vakata.com)
*
* Licensed same as jquery - under the terms of either the MIT License or the GPL Version 2 License
*   http://www.opensource.org/licenses/mit-license.php
*/

/*
* jsTree core
*/
(function ($) {

  // private variables
  var instances = [],     // instance array (used by $.jstree.reference/create/focused)
    focused_instance = -1,  // the index in the instance array of the currently focused instance
    plugins = {},     // list of included plugins
    prepared_move = {};   // for the move_node function

  $.inforTree = {}; //Special Namespace for some tree extensions.

  // jQuery plugin wrapper
  $.fn.inforTree = function (settings) {
    var isMethodCall = (typeof settings == 'string'), // is this a method call like $().jstree("open_node")
    args = Array.prototype.slice.call(arguments, 1),
      returnValue = this;

    // if a method call execute the method on all selected instances
    if(isMethodCall) {
      if(settings.substring(0, 1) == '_') { return returnValue; }
      this.each(function() {
        var instance = instances[$.data(this, "jstree_instance_id")],
          methodValue = (instance && $.isFunction(instance[settings])) ? instance[settings].apply(instance, args) : instance;
          if(typeof methodValue !== "undefined" && (settings.indexOf("is_") === 0 || (methodValue !== true && methodValue !== false))) { returnValue = methodValue; return false; }
      });
    }
    else {
      this.each(function() {
        // extend settings and allow for multiple hashes and $.data
        var instance_id = $.data(this, "jstree_instance_id"),
          a = [],
          b = settings ? $.extend({}, true, settings) : {},
          c = $(this),
          s = false,
          t = [];
        a = a.concat(args);
        if(c.data("jstree")) { a.push(c.data("jstree")); }
        b = a.length ? $.extend.apply(null, [true, b].concat(a)) : b;

        // if an instance already exists, destroy it first
        if(typeof instance_id !== "undefined" && instances[instance_id]) { instances[instance_id].destroy(); }
        // push a new empty object to the instances array
        instance_id = parseInt(instances.push({}),10) - 1;
        // store the jstree instance id to the container element
        $.data(this, "jstree_instance_id", instance_id);
        // clean up all plugins
        b.plugins = $.isArray(b.plugins) ? b.plugins : $.jstree.defaults.plugins.slice();
        b.plugins.unshift("core");
        // only unique plugins
        b.plugins = b.plugins.sort().join(",,").replace(/(,|^)([^,]+)(,,\2)+(,|$)/g,"$1$2$4").replace(/,,+/g,",").replace(/,$/,"").split(",");

        // extend defaults with passed data
        s = $.extend(true, {}, $.jstree.defaults, b);
        s.plugins = b.plugins;
        $.each(plugins, function (i, val) {
          if($.inArray(i, s.plugins) === -1) { s[i] = null; delete s[i]; }
          else { t.push(i); }
        });
        s.plugins = t;

        // push the new object to the instances array (at the same time set the default classes to the container) and init
        instances[instance_id] = new $.jstree._instance(instance_id, $(this).addClass("jstree jstree-" + instance_id), s);
        // init all activated plugins for this instance
        $.each(instances[instance_id]._get_settings().plugins, function (i, val) { instances[instance_id].data[val] = {}; });
        $.each(instances[instance_id]._get_settings().plugins, function (i, val) { if(plugins[val]) { plugins[val].__init.apply(instances[instance_id]); } });
        // initialize the instance
        if (instances[instance_id]) {
          instances[instance_id].init();
        }
      });
    }

    //If the parent is a left pane of the splitter override the overflow
    if ($(this).parent().is("#leftPane")) {
      $(this).parent().css("overflow", "hidden");
    }

    // return the jquery selection (or if it was a method call that returned a value - the returned value)
    return returnValue;
  };
  // object to store exposed functions and objects
  $.jstree = {
    defaults : {
      plugins : []
    },
    _focused : function () {
        if ($("*:focus").length != 0) {
          return;
        }
        return instances[focused_instance] || null; },
    _reference : function (needle) {
      // get by instance id
      if(instances[needle]) { return instances[needle]; }
      // get by DOM (if still no luck - return null
      var o = $(needle);
      if(!o.length && typeof needle === "string") { o = $("#" + needle); }
      if(!o.length) { return null; }
      return instances[o.closest(".jstree").data("jstree_instance_id")] || null;
    },
    _instance : function (index, container, settings) {
      // for plugins to store data in
      this.data = { core : {} };
      this.get_settings = function () { return $.extend(true, {}, settings); };
      this._get_settings  = function () { return settings; };
      this.get_index    = function () { return index; };
      this.get_container  = function () { return container; };
      this.get_container_ul = function () { return container.children("ul:eq(0)"); };
      this._set_settings  = function (s) {
        settings = $.extend(true, {}, settings, s);
      };
    },
    _fn : { },
    plugin : function (pname, pdata) {
      pdata = $.extend({}, {
        __init    : $.noop,
        __destroy : $.noop,
        _fn     : {},
        defaults  : false
      }, pdata);
      plugins[pname] = pdata;

      $.jstree.defaults[pname] = pdata.defaults;
      $.each(pdata._fn, function (i, val) {
        val.plugin    = pname;
        val.old     = $.jstree._fn[i];
        $.jstree._fn[i] = function () {
          var rslt,
            func = val,
            args = Array.prototype.slice.call(arguments),
            evnt = new $.Event("before.jstree"),
            rlbk = false;

          if(this.data.core.locked === true && i !== "unlock" && i !== "is_locked") { return; }

          // Check if function belongs to the included plugins of this instance
          do {
            if(func && func.plugin && $.inArray(func.plugin, this._get_settings().plugins) !== -1) { break; }
            func = func.old;
          } while(func);
          if(!func) { return; }

          // context and function to trigger events, then finally call the function
          if(i.indexOf("_") === 0) {
            rslt = func.apply(this, args);
          }
          else {
            rslt = this.get_container().triggerHandler(evnt, { "func" : i, "inst" : this, "args" : args, "plugin" : func.plugin });
            if(rslt === false) { return; }
            if(typeof rslt !== "undefined") { args = rslt; }

            rslt = func.apply(
              $.extend({}, this, {
                __callback : function (data) {
                  this.get_container().triggerHandler( i + '.jstree', { "inst" : this, "args" : args, "rslt" : data, "rlbk" : rlbk });
                },
                __rollback : function () {
                  rlbk = this.get_rollback();
                  return rlbk;
                },
                __call_old : function (replace_arguments) {
                  return func.old.apply(this, (replace_arguments ? Array.prototype.slice.call(arguments, 1) : args ) );
                }
              }), args);
          }

          // return the result
          return rslt;
        };
        $.jstree._fn[i].old = val.old;
        $.jstree._fn[i].plugin = pname;
      });
    },
    rollback : function (rb) {
      if(rb) {
        if(!$.isArray(rb)) { rb = [ rb ]; }
        $.each(rb, function (i, val) {
          instances[val.i].set_rollback(val.h, val.d);
        });
      }
    }
  };
  // set the prototype for all instances
  $.jstree._fn = $.jstree._instance.prototype = {};

  // core functions (open, close, create, update, delete)
  $.jstree.plugin("core", {
    __init : function () {
      this.data.core.locked = false;
      this.data.core.to_open = this.get_settings().core.initially_open;
      this.data.core.to_load = this.get_settings().core.initially_load;
    },
    defaults : {
      html_titles : false,
      animation : 500,
      initially_open : [],
      initially_load : [],
      open_parents : true,
      notify_plugins : true,
      rtl     : false,
      load_open : false,
      strings   : {
        loading   : Globalize.localize("Loading"),
        new_node  : Globalize.localize("NewNode"),
        multiple_selection : "Multiple selection"
      }
    },
    _fn : {
      init  : function () {
        this.set_focus();
        if(this._get_settings().core.rtl) {
          this.get_container().addClass("jstree-rtl").css("direction", "rtl");
        }
        this.get_container().html("<ul><li class='jstree-last jstree-leaf'><ins>&#160;</ins><a class='jstree-loading' href='#'><ins class='jstree-icon'><span>&#160;</span></ins>" + this._get_string("loading") + "</a></li></ul>");
        this.data.core.li_height = this.get_container_ul().find("li.jstree-closed, li.jstree-leaf").eq(0).height() || 18;

        this.get_container()
          .delegate("li > ins", "click.jstree", $.proxy(function (event) {
              var trgt = $(event.target);
              // if(trgt.is("ins") && event.pageY - trgt.offset().top < this.data.core.li_height) { this.toggle_node(trgt); }
              this.toggle_node(trgt);
            }, this))
          .bind("mousedown.jstree", $.proxy(function () {
              this.set_focus(); // This used to be setTimeout(set_focus,0) - why?
            }, this))
          .bind("dblclick.jstree", function (event) {
            var sel;
            if(document.selection && document.selection.empty) { document.selection.empty(); }
            else {
              if(window.getSelection) {
                sel = window.getSelection();
                try {
                  sel.removeAllRanges();
                  sel.collapse();
                } catch (err) { }
              }
            }
          });
        if(this._get_settings().core.notify_plugins) {
          this.get_container()
            .bind("load_node.jstree", $.proxy(function (e, data) {
                var o = this._get_node(data.rslt.obj),
                  t = this;
                if(o === -1) { o = this.get_container_ul(); }
                if(!o.length) { return; }
                o.find("li").each(function () {
                  var th = $(this);
                  if(th.data("jstree")) {
                    $.each(th.data("jstree"), function (plugin, values) {
                      if(t.data[plugin] && $.isFunction(t["_" + plugin + "_notify"])) {
                        t["_" + plugin + "_notify"].call(t, th, values);
                      }
                    });
                  }
                });
              }, this));
        }
        if(this._get_settings().core.load_open) {
          this.get_container()
            .bind("load_node.jstree", $.proxy(function (e, data) {
                var o = this._get_node(data.rslt.obj),
                  t = this;
                if(o === -1) { o = this.get_container_ul(); }
                if(!o.length) { return; }
                o.find("li.jstree-open:not(:has(ul))").each(function () {
                  t.load_node(this, $.noop, $.noop);
                });
              }, this));
        }
        this.__callback();
        this.load_node(-1, function () { this.loaded(); this.reload_nodes(); });
      },
      destroy : function () {
        var i,
          n = this.get_index(),
          s = this._get_settings(),
          _this = this;

        $.each(s.plugins, function (i, val) {
          try { plugins[val].__destroy.apply(_this); } catch(err) { }
        });
        this.__callback();
        // set focus to another instance if this one is focused
        if(this.is_focused()) {
          for(i in instances) {
            if(instances.hasOwnProperty(i) && i != n) {
              instances[i].set_focus();
              break;
            }
          }
        }
        // if no other instance found
        if(n === focused_instance) { focused_instance = -1; }
        // remove all traces of jstree in the DOM (only the ones set using jstree*) and cleans all events
        this.get_container()
          .unbind(".jstree")
          .undelegate(".jstree")
          .removeData("jstree_instance_id")
          .find("[class^='jstree']")
            .andSelf()
            .attr("class", function () { return this.className.replace(/jstree[^ ]*|$/ig,''); });
        $(document)
          .unbind(".jstree-" + n)
          .undelegate(".jstree-" + n);
        // remove the actual data
        instances[n] = null;
        delete instances[n];
      },

      _core_notify : function (n, data) {
        if(data.opened) {
          this.open_node(n, false, true);
        }
      },

      lock : function () {
        this.data.core.locked = true;
        this.get_container().children("ul").addClass("jstree-locked").css("opacity","0.7");
        this.__callback({});
      },
      unlock : function () {
        this.data.core.locked = false;
        this.get_container().children("ul").removeClass("jstree-locked").css("opacity","1");
        this.__callback({});
      },
      is_locked : function () { return this.data.core.locked; },
      save_opened : function () {
        var _this = this;
        this.data.core.to_open = [];
        this.get_container_ul().find("li.jstree-open").each(function () {
          if(this.id) { _this.data.core.to_open.push("#" + this.id.toString().replace(/^#/,"").replace(/\\\//g,"/").replace(/\//g,"\\\/").replace(/\\\./g,".").replace(/\./g,"\\.").replace(/\:/g,"\\:")); }
        });
        this.__callback(_this.data.core.to_open);
      },
      save_loaded : function () { },
      reload_nodes : function (is_callback) {
        var _this = this,
          done = true,
          current = [],
          remaining = [];
        if(!is_callback) {
          this.data.core.reopen = false;
          this.data.core.refreshing = true;
          this.data.core.to_open = $.map($.makeArray(this.data.core.to_open), function (n) { return "#" + n.toString().replace(/^#/,"").replace(/\\\//g,"/").replace(/\//g,"\\\/").replace(/\\\./g,".").replace(/\./g,"\\.").replace(/\:/g,"\\:"); });
          this.data.core.to_load = $.map($.makeArray(this.data.core.to_load), function (n) { return "#" + n.toString().replace(/^#/,"").replace(/\\\//g,"/").replace(/\//g,"\\\/").replace(/\\\./g,".").replace(/\./g,"\\.").replace(/\:/g,"\\:"); });
          if(this.data.core.to_open.length) {
            this.data.core.to_load = this.data.core.to_load.concat(this.data.core.to_open);
          }
        }
        if(this.data.core.to_load.length) {
          $.each(this.data.core.to_load, function (i, val) {
            if(val == "#") { return true; }
            if($(val).length) { current.push(val); }
            else { remaining.push(val); }
          });
          if(current.length) {
            this.data.core.to_load = remaining;
            $.each(current, function (i, val) {
              if(!_this._is_loaded(val)) {
                _this.load_node(val, function () { _this.reload_nodes(true); }, function () { _this.reload_nodes(true); });
                done = false;
              }
            });
          }
        }
        if(this.data.core.to_open.length) {
          $.each(this.data.core.to_open, function (i, val) {
            _this.open_node(val, false, true);
          });
        }
        if(done) {
          // TODO: find a more elegant approach to syncronizing returning requests
          if(this.data.core.reopen) { clearTimeout(this.data.core.reopen); }
          this.data.core.reopen = setTimeout(function () { _this.__callback({}, _this); }, 50);
          this.data.core.refreshing = false;
          this.reopen();
        }
      },
      reopen : function () {
        var _this = this;
        if(this.data.core.to_open.length) {
          $.each(this.data.core.to_open, function (i, val) {
            _this.open_node(val, false, true);
          });
        }
        this.__callback({});
      },
      refresh : function (obj) {
        var _this = this;
        this.save_opened();
        if(!obj) { obj = -1; }
        obj = this._get_node(obj);
        if(!obj) { obj = -1; }
        if(obj !== -1) { obj.children("UL").remove(); }
        else { this.get_container_ul().empty(); }
        this.load_node(obj, function () { _this.__callback({ "obj" : obj}); _this.reload_nodes(); });
      },
      // Dummy function to fire after the first load (so that there is a jstree.loaded event)
      loaded  : function () {
        this.__callback();
      },
      // deal with focus
      set_focus : function () {
        if(this.is_focused()) { return; }
        var f = $.jstree._focused();
        if(f) { f.unset_focus(); }

        this.get_container().addClass("jstree-focused");
        focused_instance = this.get_index();
        this.__callback();
      },
      is_focused  : function () {
        return focused_instance == this.get_index();
      },
      unset_focus : function () {
        if(this.is_focused()) {
          this.get_container().removeClass("jstree-focused");
          focused_instance = -1;
        }
        this.__callback();
      },

      // traverse
      _get_node   : function (obj) {
        var $obj = $(obj, this.get_container());
        if($obj.is(".jstree") || obj == -1) { return -1; }
        $obj = $obj.closest("li", this.get_container());
        return $obj.length ? $obj : false;
      },
      _get_next   : function (obj, strict) {
        obj = this._get_node(obj);
        if(obj === -1) { return this.get_container().find("> ul > li:first-child"); }
        if(!obj.length) { return false; }
        if(strict) { return (obj.nextAll("li").size() > 0) ? obj.nextAll("li:eq(0)") : false; }

        if(obj.hasClass("jstree-open")) { return obj.find("li:eq(0)"); }
        else if(obj.nextAll("li").size() > 0) { return obj.nextAll("li:eq(0)"); }
        else { return obj.parentsUntil(".jstree","li").next("li").eq(0); }
      },
      _get_prev   : function (obj, strict) {
        obj = this._get_node(obj);
        if(obj === -1) { return this.get_container().find("> ul > li:last-child"); }
        if(!obj.length) { return false; }
        if(strict) { return (obj.prevAll("li").length > 0) ? obj.prevAll("li:eq(0)") : false; }

        if(obj.prev("li").length) {
          obj = obj.prev("li").eq(0);
          while(obj.hasClass("jstree-open")) { obj = obj.children("ul:eq(0)").children("li:last"); }
          return obj;
        }
        else { var o = obj.parentsUntil(".jstree","li:eq(0)"); return o.length ? o : false; }
      },
      _get_parent   : function (obj) {
        obj = this._get_node(obj);
        if(obj == -1 || !obj.length) { return false; }
        var o = obj.parentsUntil(".jstree", "li:eq(0)");
        return o.length ? o : -1;
      },
      _get_children : function (obj) {
        obj = this._get_node(obj);
        if(obj === -1) { return this.get_container().children("ul:eq(0)").children("li"); }
        if(!obj.length) { return false; }
        return obj.children("ul:eq(0)").children("li");
      },
      get_path    : function (obj, id_mode) {
        var p = [],
          _this = this;
        obj = this._get_node(obj);
        if(obj === -1 || !obj || !obj.length) { return false; }
        obj.parentsUntil(".jstree", "li").each(function () {
          p.push( id_mode ? this.id : _this.get_text(this) );
        });
        p.reverse();
        p.push( id_mode ? obj.attr("id") : this.get_text(obj) );
        return p;
      },

      // string functions
      _get_string : function (key) {
        return this._get_settings().core.strings[key] || key;
      },

      is_open   : function (obj) { obj = this._get_node(obj); return obj && obj !== -1 && obj.hasClass("jstree-open"); },
      is_closed : function (obj) { obj = this._get_node(obj); return obj && obj !== -1 && obj.hasClass("jstree-closed"); },
      is_leaf   : function (obj) { obj = this._get_node(obj); return obj && obj !== -1 && obj.hasClass("jstree-leaf"); },
      correct_state : function (obj) {
        obj = this._get_node(obj);
        if(!obj || obj === -1) { return false; }
        obj.removeClass("jstree-closed jstree-open").addClass("jstree-leaf").children("ul").remove();
        this.__callback({ "obj" : obj });
      },
      // open/close
      open_node : function (obj, callback, skip_animation) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        if(!obj.hasClass("jstree-closed")) { if(callback) { callback.call(); } return false; }
        var s = skip_animation  ? 0 : this._get_settings().core.animation,
          t = this;
        if(!this._is_loaded(obj)) {
          obj.children("a").addClass("jstree-loading");
          this.load_node(obj, function () { t.open_node(obj, callback, skip_animation); }, callback);
        }
        else {
          if(this._get_settings().core.open_parents) {
            obj.parentsUntil(".jstree",".jstree-closed").each(function () {
              t.open_node(this, false, true);
            });
          }
          if(s) { obj.children("ul").css("display","none"); }
          obj.removeClass("jstree-closed").addClass("jstree-open").children("a").removeClass("jstree-loading");
          if(s) { obj.children("ul").stop(true, true).slideDown(s, function () { this.style.display = ""; t.after_open(obj); }); }
          else { t.after_open(obj); }
          this.__callback({ "obj" : obj });
          if(callback) { callback.call(); }
        }
      },
      after_open  : function (obj) { this.__callback({ "obj" : obj }); },
      close_node  : function (obj, skip_animation) {
        obj = this._get_node(obj);
        var s = skip_animation ? 0 : this._get_settings().core.animation,
          t = this;
        if(!obj.length || !obj.hasClass("jstree-open")) { return false; }
        if(s) { obj.children("ul").attr("style","display:block !important"); }
        obj.removeClass("jstree-open").addClass("jstree-closed");
        if(s) { obj.children("ul").stop(true, true).slideUp(s, function () { this.style.display = ""; t.after_close(obj); }); }
        else { t.after_close(obj); }
        this.__callback({ "obj" : obj });
      },
      after_close : function (obj) { this.__callback({ "obj" : obj }); },
      toggle_node : function (obj) {
        obj = this._get_node(obj);
        if(obj.hasClass("jstree-closed")) { return this.open_node(obj); }
        if(obj.hasClass("jstree-open")) { return this.close_node(obj); }
      },
      open_all  : function (obj, do_animation, original_obj) {
        obj = obj ? this._get_node(obj) : -1;
        if(!obj || obj === -1) { obj = this.get_container_ul(); }
        if(original_obj) {
          obj = obj.find("li.jstree-closed");
        }
        else {
          original_obj = obj;
          if(obj.is(".jstree-closed")) { obj = obj.find("li.jstree-closed").andSelf(); }
          else { obj = obj.find("li.jstree-closed"); }
        }
        var _this = this;
        obj.each(function () {
          var __this = this;
          if(!_this._is_loaded(this)) { _this.open_node(this, function() { _this.open_all(__this, do_animation, original_obj); }, !do_animation); }
          else { _this.open_node(this, false, !do_animation); }
        });
        // so that callback is fired AFTER all nodes are open
        if(original_obj.find('li.jstree-closed').length === 0) { this.__callback({ "obj" : original_obj }); }
      },
      close_all : function (obj, do_animation) {
        var _this = this;
        obj = obj ? this._get_node(obj) : this.get_container();
        if(!obj || obj === -1) { obj = this.get_container_ul(); }
        obj.find("li.jstree-open").andSelf().each(function () { _this.close_node(this, !do_animation); });
        this.__callback({ "obj" : obj });
      },
      clean_node  : function (obj) {
        obj = obj && obj != -1 ? $(obj) : this.get_container_ul();
        obj = obj.is("li") ? obj.find("li").andSelf() : obj.find("li");
        obj.removeClass("jstree-last")
          .filter("li:last-child").addClass("jstree-last").end()
          .filter(":has(li)")
            .not(".jstree-open").removeClass("jstree-leaf").addClass("jstree-closed");
        obj.not(".jstree-open, .jstree-closed").addClass("jstree-leaf").children("ul").remove();
        this.__callback({ "obj" : obj });
      },
      // rollback
      get_rollback : function () {
        this.__callback();
        return { i : this.get_index(), h : this.get_container().children("ul").clone(true), d : this.data };
      },
      set_rollback : function (html, data) {
        this.get_container().empty().append(html);
        this.data = data;
        this.__callback();
      },
      // Dummy functions to be overwritten by any datastore plugin included
      load_node : function (obj, s_call, e_call) { this.__callback({ "obj" : obj }); },
      _is_loaded  : function (obj) { return true; },

      // Basic operations: create
      create_node : function (obj, position, js, callback, is_loaded) {
        obj = this._get_node(obj);
        position = typeof position === "undefined" ? "last" : position;
        var d = $("<li />"),
          s = this._get_settings().core,
          tmp;

        if(obj !== -1 && !obj.length) { return false; }
        if(!is_loaded && !this._is_loaded(obj)) { this.load_node(obj, function () { this.create_node(obj, position, js, callback, true); }); return false; }

        this.__rollback();

        if(typeof js === "string") { js = { "data" : js }; }
        if(!js) { js = {}; }
        if(js.attr) { d.attr(js.attr); }
        if(js.metadata) { d.data(js.metadata); }
        if(js.state) { d.addClass("jstree-" + js.state); }
        if(!js.data) { js.data = this._get_string("new_node"); }
        if(!$.isArray(js.data)) { tmp = js.data; js.data = []; js.data.push(tmp); }
        $.each(js.data, function (i, m) {
          tmp = $("<a tabIndex='-1'/>");
          if($.isFunction(m)) { m = m.call(this, js); }
          if(typeof m == "string") { tmp.attr('href','#')[ s.html_titles ? "html" : "text" ](m); }
          else {
            if(!m.attr) { m.attr = {}; }
            if(!m.attr.href) { m.attr.href = '#'; }
            tmp.attr(m.attr)[ s.html_titles ? "html" : "text" ](m.title);
            if(m.language) { tmp.addClass(m.language); }
          }
          tmp.prepend("<ins class='jstree-icon'><span>&#160;</span></ins>");
          if(!m.icon && js.icon) { m.icon = js.icon; }
          if(m.icon) {
            if(m.icon.indexOf("/") === -1) { tmp.children("ins").addClass(m.icon); }
            else { tmp.children("ins").css("background","url('" + m.icon + "') center center no-repeat"); }
          }
          d.append(tmp);
        });
        d.prepend("<ins class='jstree-icon'><span>&#160;</span></ins>");
        if(obj === -1) {
          obj = this.get_container();
          if(position === "before") { position = "first"; }
          if(position === "after") { position = "last"; }
        }
        switch(position) {
          case "before": obj.before(d); tmp = this._get_parent(obj); break;
          case "after" : obj.after(d);  tmp = this._get_parent(obj); break;
          case "inside":
          case "first" :
            if(!obj.children("ul").length) { obj.append("<ul />"); }
            obj.children("ul").prepend(d);
            tmp = obj;
            break;
          case "last":
            if(!obj.children("ul").length) { obj.append("<ul />"); }
            obj.children("ul").append(d);
            tmp = obj;
            break;
          default:
            if(!obj.children("ul").length) { obj.append("<ul />"); }
            if(!position) { position = 0; }
            tmp = obj.children("ul").children("li").eq(position);
            if(tmp.length) { tmp.before(d); }
            else { obj.children("ul").append(d); }
            tmp = obj;
            break;
        }
        if(tmp === -1 || tmp.get(0) === this.get_container().get(0)) { tmp = -1; }
        this.clean_node(tmp);
        this.__callback({ "obj" : d, "parent" : tmp });
        if(callback) { callback.call(this, d); }
        return d;
      },
      // Basic operations: rename (deal with text)
      get_text  : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        var s = this._get_settings().core.html_titles;
        obj = obj.children("a:eq(0)");
        if(s) {
          obj = obj.clone();
          obj.children("INS").remove();
          return obj.html();
        }
        else {
          obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
          return obj.nodeValue;
        }
      },
      set_text  : function (obj, val) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        obj = obj.children("a:eq(0)");
        if(this._get_settings().core.html_titles) {
          var tmp = obj.children("INS").clone();
          obj.html(val).prepend(tmp);
          this.__callback({ "obj" : obj, "name" : val });
          return true;
        }
        else {
          obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
          this.__callback({ "obj" : obj, "name" : val });
          return (obj.nodeValue = val);
        }
      },
      rename_node : function (obj, val) {
        obj = this._get_node(obj);
        this.__rollback();
        if(obj && obj.length && this.set_text.apply(this, Array.prototype.slice.call(arguments))) { this.__callback({ "obj" : obj, "name" : val }); }
      },
      // Basic operations: deleting nodes
      delete_node : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        this.__rollback();
        var p = this._get_parent(obj), prev = $([]), t = this;
        obj.each(function () {
          prev = prev.add(t._get_prev(this));
        });
        obj = obj.detach();
        if(p !== -1 && p.find("> ul > li").length === 0) {
          p.removeClass("jstree-open jstree-closed").addClass("jstree-leaf");
        }
        this.clean_node(p);
        this.__callback({ "obj" : obj, "prev" : prev, "parent" : p });
        return obj;
      },
      prepare_move : function (o, r, pos, cb, is_cb) {
        var p = {};

        p.ot = $.jstree._reference(o) || this;
        p.o = p.ot._get_node(o);
        p.r = r === - 1 ? -1 : this._get_node(r);
        p.p = (typeof pos === "undefined" || pos === false) ? "last" : pos; // TODO: move to a setting
        if(!is_cb && prepared_move.o && prepared_move.o[0] === p.o[0] && prepared_move.r[0] === p.r[0] && prepared_move.p === p.p) {
          this.__callback(prepared_move);
          if(cb) { cb.call(this, prepared_move); }
          return;
        }
        p.ot = $.jstree._reference(p.o) || this;
        p.rt = $.jstree._reference(p.r) || this; // r === -1 ? p.ot : $.jstree._reference(p.r) || this
        if(p.r === -1 || !p.r) {
          p.cr = -1;
          switch(p.p) {
            case "first":
            case "before":
            case "inside":
              p.cp = 0;
              break;
            case "after":
            case "last":
              p.cp = p.rt.get_container().find(" > ul > li").length;
              break;
            default:
              p.cp = p.p;
              break;
          }
        }
        else {
          if(!/^(before|after)$/.test(p.p) && !this._is_loaded(p.r)) {
            return this.load_node(p.r, function () { this.prepare_move(o, r, pos, cb, true); });
          }
          switch(p.p) {
            case "before":
              p.cp = p.r.index();
              p.cr = p.rt._get_parent(p.r);
              break;
            case "after":
              p.cp = p.r.index() + 1;
              p.cr = p.rt._get_parent(p.r);
              break;
            case "inside":
            case "first":
              p.cp = 0;
              p.cr = p.r;
              break;
            case "last":
              p.cp = p.r.find(" > ul > li").length;
              p.cr = p.r;
              break;
            default:
              p.cp = p.p;
              p.cr = p.r;
              break;
          }
        }
        p.np = p.cr == -1 ? p.rt.get_container() : p.cr;
        p.op = p.ot._get_parent(p.o);
        p.cop = p.o.index();
        if(p.op === -1) { p.op = p.ot ? p.ot.get_container() : this.get_container(); }
        if(!/^(before|after)$/.test(p.p) && p.op && p.np && p.op[0] === p.np[0] && p.o.index() < p.cp) { p.cp++; }
        //if(p.p === "before" && p.op && p.np && p.op[0] === p.np[0] && p.o.index() < p.cp) { p.cp--; }
        p.or = p.np.find(" > ul > li:nth-child(" + (p.cp + 1) + ")");
        prepared_move = p;
        this.__callback(prepared_move);
        if(cb) { cb.call(this, prepared_move); }
      },
      check_move : function () {
        var obj = prepared_move, ret = true, r = obj.r === -1 ? this.get_container() : obj.r;
        if(!obj || !obj.o || obj.or[0] === obj.o[0]) { return false; }
        if(obj.op && obj.np && obj.op[0] === obj.np[0] && obj.cp - 1 === obj.o.index()) { return false; }
        obj.o.each(function () {
          if(r.parentsUntil(".jstree", "li").andSelf().index(this) !== -1) { ret = false; return false; }
        });
        return ret;
      },
      move_node : function (obj, ref, position, is_copy, is_prepared, skip_check) {
        if(!is_prepared) {
          return this.prepare_move(obj, ref, position, function (p) {
            this.move_node(p, false, false, is_copy, true, skip_check);
          });
        }
        if(is_copy) {
          prepared_move.cy = true;
        }
        if(!skip_check && !this.check_move()) { return false; }

        this.__rollback();
        var o = false;
        if(is_copy) {
          o = obj.o.clone(true);
          o.find("*[id]").andSelf().each(function () {
            if(this.id) { this.id = "copy_" + this.id; }
          });
        }
        else { o = obj.o; }

        if(obj.or.length) { obj.or.before(o); }
        else {
          if(!obj.np.children("ul").length) { $("<ul />").appendTo(obj.np); }
          obj.np.children("ul:eq(0)").append(o);
        }

        try {
          obj.ot.clean_node(obj.op);
          obj.rt.clean_node(obj.np);
          if(!obj.op.find("> ul > li").length) {
            obj.op.removeClass("jstree-open jstree-closed").addClass("jstree-leaf").children("ul").remove();
          }
        } catch (e) { }

        if(is_copy) {
          prepared_move.cy = true;
          prepared_move.oc = o;
        }
        this.__callback(prepared_move);
        return prepared_move;
      },
      _get_move : function () { return prepared_move; }
    }
  });
})(jQuery);

/*
* jsTree ui plugin
* This plugins handles selecting/deselecting/hovering/dehovering nodes
*/
(function ($) {
  var scrollbar_width, e1, e2;
  $(function() {
    if (/msie/.test(navigator.userAgent.toLowerCase())) {
      e1 = $('<textarea cols="10" rows="2"></textarea>').css({ position: 'absolute', top: -1000, left: 0 }).appendTo('body');
      e2 = $('<textarea cols="10" rows="2" style="overflow: hidden;"></textarea>').css({ position: 'absolute', top: -1000, left: 0 }).appendTo('body');
      scrollbar_width = e1.width() - e2.width();
      e1.add(e2).remove();
    }
    else {
      e1 = $('<div />').css({ width: 100, height: 100, overflow: 'auto', position: 'absolute', top: -1000, left: 0 })
          .prependTo('body').append('<div />').find('div').css({ width: '100%', height: 200 });
      scrollbar_width = 100 - e1.width();
      e1.parent().remove();
    }
  });
  $.jstree.plugin("ui", {
    __init : function () {
      	var self = this;
		this.scroll = 0;
        this.data.ui.selected = $();
        this.data.ui.last_selected = false;
        this.data.ui.hovered = null;
        this.data.ui.to_select = this.get_settings().ui.initially_select;

        this.get_container()
          .delegate("a", "click.jstree", $.proxy(function (event) {
              event.preventDefault();
              event.currentTarget.blur();
              if(!$(event.currentTarget).hasClass("jstree-loading")) {
                this.select_node(event.currentTarget, true, event);
              }
  						self.get_container().scrollLeft(self.scroll);
            }, this))
          .delegate("a", "mouseenter.jstree", $.proxy(function (event) {
              if(!$(event.currentTarget).hasClass("jstree-loading")) {
                this.hover_node(event.target);
              }
  						this.scroll = self.get_container().scrollLeft();
            }, this))
        .delegate("a", "mouseleave.jstree", $.proxy(function (event) {
            if(!$(event.currentTarget).hasClass("jstree-loading")) {
              this.dehover_node(event.target);
            }
          }, this))
        .bind("reopen.jstree", $.proxy(function () {
            this.reselect();
          }, this))
        .bind("get_rollback.jstree", $.proxy(function () {
            this.dehover_node();
            this.save_selected();
          }, this))
        .bind("set_rollback.jstree", $.proxy(function () {
            this.reselect();
          }, this))
        .bind("close_node.jstree", $.proxy(function (event, data) {
            var s = this._get_settings().ui,
              obj = this._get_node(data.rslt.obj),
              clk = (obj && obj.length) ? obj.children("ul").find("a.jstree-clicked") : $(),
              _this = this;
            if(s.selected_parent_close === false || !clk.length) { return; }
            clk.each(function () {
              _this.deselect_node(this);
              if(s.selected_parent_close === "select_parent") { _this.select_node(obj); }
            });
          }, this))
        .bind("delete_node.jstree", $.proxy(function (event, data) {
            var s = this._get_settings().ui.select_prev_on_delete,
              obj = this._get_node(data.rslt.obj),
              clk = (obj && obj.length) ? obj.find("a.jstree-clicked") : [],
              _this = this;
            clk.each(function () { _this.deselect_node(this); });
            if(s && clk.length) {
              data.rslt.prev.each(function () {
                if(this.parentNode) { _this.select_node(this); return false; /* if return false is removed all prev nodes will be selected */}
              });
            }
          }, this))
        .bind("move_node.jstree", $.proxy(function (event, data) {
            if(data.rslt.cy) {
              data.rslt.oc.find("a.jstree-clicked").removeClass("jstree-clicked");
            }
          }, this));
    },
    defaults : {
      select_limit : -1, // 0, 1, 2 ... or -1 for unlimited
      select_multiple_modifier : "ctrl", // on, or ctrl, shift, alt
      select_range_modifier : "shift",
      selected_parent_close : "select_parent", // false, "deselect", "select_parent"
      selected_parent_open : true,
      select_prev_on_delete : true,
      disable_selecting_children : false,
      initially_select : []
    },
    _fn : {
      _get_node : function (obj, allow_multiple) {
        if(typeof obj === "undefined" || obj === null) { return allow_multiple ? this.data.ui.selected : this.data.ui.last_selected; }
        var $obj = $(obj, this.get_container());
        if($obj.is(".jstree") || obj == -1) { return -1; }
        $obj = $obj.closest("li", this.get_container());
        return $obj.length ? $obj : false;
      },
      _ui_notify : function (n, data) {
        if(data.selected) {
          this.select_node(n, false);
        }
      },
      save_selected : function () {
        var _this = this;
        this.data.ui.to_select = [];
        this.data.ui.selected.each(function () { if(this.id) { _this.data.ui.to_select.push("#" + this.id.toString().replace(/^#/,"").replace(/\\\//g,"/").replace(/\//g,"\\\/").replace(/\\\./g,".").replace(/\./g,"\\.").replace(/\:/g,"\\:")); } });
        this.__callback(this.data.ui.to_select);
      },
      reselect : function () {
        var _this = this,
          s = this.data.ui.to_select;
        s = $.map($.makeArray(s), function (n) { return "#" + n.toString().replace(/^#/,"").replace(/\\\//g,"/").replace(/\//g,"\\\/").replace(/\\\./g,".").replace(/\./g,"\\.").replace(/\:/g,"\\:"); });
        // this.deselect_all(); WHY deselect, breaks plugin state notifier?
        $.each(s, function (i, val) { if(val && val !== "#") { _this.select_node(val); } });
        this.data.ui.selected = this.data.ui.selected.filter(function () { return this.parentNode; });
        this.__callback();
      },
      refresh : function (obj) {
        this.save_selected();
        return this.__call_old();
      },
      hover_node : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        //if(this.data.ui.hovered && obj.get(0) === this.data.ui.hovered.get(0)) { return; }
        if(!obj.hasClass("jstree-hovered")) { this.dehover_node(); }
        this.data.ui.hovered = obj.children("a").addClass("jstree-hovered").parent();
        this._fix_scroll(obj);
        this.__callback({ "obj" : obj });
      },
      dehover_node : function () {
        var obj = this.data.ui.hovered, p;
        if(!obj || !obj.length) { return false; }
        p = obj.children("a").removeClass("jstree-hovered").parent();
        if(this.data.ui.hovered[0] === p[0]) { this.data.ui.hovered = null; }
        this.__callback({ "obj" : obj });
      },
      focus_node : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
          //if(this.data.ui.hovered && obj.get(0) === this.data.ui.hovered.get(0)) { return; }
        this.get_container().find('.jstree-focus').each(function () {
            $(this).attr("tabIndex", "-1");
            $(this).removeClass("jstree-focus");
        });

        // get initial scroll value
        this.scroll = this.get_container().scrollLeft();

        if(!obj.hasClass("jstree-focus")) { this.defocus_node(); }
        this.data.ui.hovered = obj.children("a").addClass("jstree-focus").parent();
        obj.children("a").focus();
        obj.children("a").attr("tabIndex", "0");
        this._fix_scroll(obj);
        this.__callback({ "obj" : obj });
        // return to the initial scroll position
        this.get_container().scrollLeft(this.scroll);
      },
      defocus_node : function () {
        var obj = this.data.ui.hovered, p;
        if(!obj || !obj.length) { return false; }
        p = obj.children("a").removeClass("jstree-focus").parent();
        obj.children("a").attr("tabIndex", "-1");
        if(this.data.ui.hovered[0] === p[0]) { this.data.ui.hovered = null; }
        this.__callback({ "obj" : obj });
      },
      select_node : function (obj, check, e) {
        obj = this._get_node(obj);
        if(obj == -1 || !obj || !obj.length) { return false; }
        var s = this._get_settings().ui,
          is_multiple = (s.select_multiple_modifier == "on" || (s.select_multiple_modifier !== false && e && e[s.select_multiple_modifier + "Key"])),
          is_range = (s.select_range_modifier !== false && e && e[s.select_range_modifier + "Key"] && this.data.ui.last_selected && this.data.ui.last_selected[0] !== obj[0] && this.data.ui.last_selected.parent()[0] === obj.parent()[0]),
          is_selected = this.is_selected(obj),
          proceed = true,
          t = this;
        if(check) {
          if(s.disable_selecting_children && is_multiple &&
            (
              (obj.parentsUntil(".jstree","li").children("a.jstree-clicked").length) ||
              (obj.children("ul").find("a.jstree-clicked:eq(0)").length)
            )
          ) {
            return false;
          }
          proceed = false;
          switch(!0) {
            case (is_range):
              this.data.ui.last_selected.addClass("jstree-last-selected");
              obj = obj[ obj.index() < this.data.ui.last_selected.index() ? "nextUntil" : "prevUntil" ](".jstree-last-selected").andSelf();
              if(s.select_limit == -1 || obj.length < s.select_limit) {
                this.data.ui.last_selected.removeClass("jstree-last-selected");
                this.data.ui.selected.each(function () {
                  if(this !== t.data.ui.last_selected[0]) { t.deselect_node(this); }
                });
                is_selected = false;
                proceed = true;
              }
              else {
                proceed = false;
              }
              break;
            case (is_selected && !is_multiple):
              this.deselect_all();
              is_selected = false;
              proceed = true;
              break;
            case (!is_selected && !is_multiple):
              if(s.select_limit == -1 || s.select_limit > 0) {
                this.deselect_all();
                proceed = true;
              }
              break;
            case (is_selected && is_multiple):
              this.deselect_node(obj);
              break;
            case (!is_selected && is_multiple):
              if(s.select_limit == -1 || this.data.ui.selected.length + 1 <= s.select_limit) {
                proceed = true;
              }
              break;
          }
        }
        if(proceed && !is_selected) {
          if(!is_range) { this.data.ui.last_selected = obj; }
          obj.children("a").addClass("jstree-clicked");
          if(s.selected_parent_open) {
            obj.parents(".jstree-closed").each(function () { t.open_node(this, false, true); });
          }
          this.data.ui.selected = this.data.ui.selected.add(obj);
          this.focus_node(obj);
          this._fix_scroll(obj.eq(0));
          this.__callback({ "obj" : obj, "e" : e });
        }
      },
      _fix_scroll : function (obj) {
        var c = this.get_container()[0], t;
        if(c.scrollHeight > c.offsetHeight) {
          obj = this._get_node(obj);
          if(!obj || obj === -1 || !obj.length || !obj.is(":visible")) { return; }
          t = obj.offset().top - this.get_container().offset().top;
          if(t < 0) {
            c.scrollTop = c.scrollTop + t - 1;
          }
          if(t + this.data.core.li_height + (c.scrollWidth > c.offsetWidth ? scrollbar_width : 0) > c.offsetHeight) {
            c.scrollTop = c.scrollTop + (t - c.offsetHeight + this.data.core.li_height + 1 + (c.scrollWidth > c.offsetWidth ? scrollbar_width : 0));
          }
        }
      },
      deselect_node : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        if(this.is_selected(obj)) {
          obj.children("a").removeClass("jstree-clicked").removeClass("jstree-focus");
          this.data.ui.selected = this.data.ui.selected.not(obj);
          if(this.data.ui.last_selected.get(0) === obj.get(0)) { this.data.ui.last_selected = this.data.ui.selected.eq(0); }
          this.__callback({ "obj" : obj });
        }
      },
      toggle_select : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        if(this.is_selected(obj)) { this.deselect_node(obj); }
        else { this.select_node(obj); }
      },
      is_selected : function (obj) { return this.data.ui.selected.index(this._get_node(obj)) >= 0; },
      get_selected : function (context) {
        return context ? $(context).find("a.jstree-clicked").parent() : this.data.ui.selected;
      },
      deselect_all : function (context) {
        var ret = context ? $(context).find("a.jstree-clicked").parent() : this.get_container().find("a.jstree-clicked").parent();
        this.get_container().find("a.jstree-focus").removeClass("jstree-focus");
        ret.children("a.jstree-clicked").removeClass("jstree-clicked");
        this.data.ui.selected = $([]);
        this.data.ui.last_selected = false;
        this.__callback({ "obj" : ret });
      }
    }
  });
  // include the selection plugin by default
  $.jstree.defaults.plugins.push("ui");
})(jQuery);

/*
* jsTree CRRM plugin
* Handles creating/renaming/removing/moving nodes by user interaction.
*/
(function ($) {
  $.jstree.plugin("crrm", {
    __init : function () {
      this.get_container()
        .bind("move_node.jstree", $.proxy(function (e, data) {
          if(this._get_settings().crrm.move.open_onmove) {
            var t = this;
            data.rslt.np.parentsUntil(".jstree").andSelf().filter(".jstree-closed").each(function () {
              t.open_node(this, false, true);
            });
          }
        }, this));
    },
    defaults : {
      input_width_limit : 200,
      move : {
        always_copy     : false, // false, true or "multitree"
        open_onmove     : true,
        default_position  : "last",
        check_move      : function (m) { return true; }
      }
    },
    _fn : {
      _show_input : function (obj, callback) {
        obj = this._get_node(obj);
        var rtl = this._get_settings().core.rtl,
          w = this._get_settings().crrm.input_width_limit,
          w1 = obj.children("ins").width(),
          w2 = obj.find("> a:visible > ins").width() * obj.find("> a:visible > ins").length,
          t = this.get_text(obj),
          h1 = $("<div />", { css : { "position" : "absolute", "top" : "-200px", "left" : (rtl ? "0px" : "-1000px"), "visibility" : "hidden" } }).appendTo("body"),
          h2 = obj.css("position","relative").append(
          $("<input />", {
            "value" : t,
            "class" : "inforTextbox",
            "css" : {
              "position" : "absolute",
              "left"  : (rtl ? "auto" : (w1 + w2 + 4) + "px"),
              "right" : (rtl ? (w1 + w2 + 4) + "px" : "auto"),
              "top" : "0px",
              "width" : "150px" // will be set a bit further down
            },
            "blur" : $.proxy(function () {
              var i = obj.children(".inforTextbox"),
                v = i.val();

              if(v === "") { v = t; }
              h1.remove();
              i.remove(); // rollback purposes
              this.set_text(obj,t); // rollback purposes
              this.rename_node(obj, v);
              callback.call(this, obj, v, t);
              obj.css("position","");
            }, this),
            "keypress" : function(event) {
              var key = event.keyCode || event.which;
              if (key == 13) {
                $(this).trigger("blur");
                return false;
              }
            }
          })
        ).children(".inforTextbox");
        this.set_text(obj, "");

        h2.val(t);
        h2.select();
      },
      rename : function (obj) {
        obj = this._get_node(obj);
        this.__rollback();
        var f = this.__callback;
        this._show_input(obj, function (obj, new_name, old_name) {
          f.call(this, { "obj" : obj, "new_name" : new_name, "old_name" : old_name });
        });
      },
      create : function (obj, position, js, callback, skip_rename) {
        var t, _this = this;
        obj = this._get_node(obj);
        if(!obj) { obj = -1; }
        this.__rollback();
        t = this.create_node(obj, position, js, function (t) {
          var p = this._get_parent(t),
            pos = $(t).index();
          if(callback) { callback.call(this, t); }
          if(p.length && p.hasClass("jstree-closed")) { this.open_node(p, false, true); }
          if(!skip_rename) {
            this._show_input(t, function (obj, new_name, old_name) {
              _this.__callback({ "obj" : obj, "name" : new_name, "parent" : p, "position" : pos });
            });
          }
          else { _this.__callback({ "obj" : t, "name" : this.get_text(t), "parent" : p, "position" : pos }); }
        });
        return t;
      },
      remove : function (obj) {
        obj = this._get_node(obj, true);
        var p = this._get_parent(obj), prev = this._get_prev(obj);
        this.__rollback();
        obj = this.delete_node(obj);
        if(obj !== false) { this.__callback({ "obj" : obj, "prev" : prev, "parent" : p }); }
      },
      check_move : function () {
        if(!this.__call_old()) { return false; }
        var s = this._get_settings().crrm.move;
        if(!s.check_move.call(this, this._get_move())) { return false; }
        return true;
      },
      move_node : function (obj, ref, position, is_copy, is_prepared, skip_check) {
        var s = this._get_settings().crrm.move;
        if(!is_prepared) {
          if(typeof position === "undefined") { position = s.default_position; }
          if(position === "inside" && !s.default_position.match(/^(before|after)$/)) { position = s.default_position; }
          return this.__call_old(true, obj, ref, position, is_copy, false, skip_check);
        }
        // if the move is already prepared
        if(s.always_copy === true || (s.always_copy === "multitree" && obj.rt.get_index() !== obj.ot.get_index() )) {
          is_copy = true;
        }
        this.__call_old(true, obj, ref, position, is_copy, true, skip_check);
      },

      cut : function (obj) {
        obj = this._get_node(obj, true);
        if(!obj || !obj.length) { return false; }
        this.data.crrm.cp_nodes = false;
        this.data.crrm.ct_nodes = obj;
        this.__callback({ "obj" : obj });
      },
      copy : function (obj) {
        obj = this._get_node(obj, true);
        if(!obj || !obj.length) { return false; }
        this.data.crrm.ct_nodes = false;
        this.data.crrm.cp_nodes = obj;
        this.__callback({ "obj" : obj });
      },
      paste : function (obj) {
        obj = this._get_node(obj);
        if(!obj || !obj.length) { return false; }
        var nodes = this.data.crrm.ct_nodes ? this.data.crrm.ct_nodes : this.data.crrm.cp_nodes;
        if(!this.data.crrm.ct_nodes && !this.data.crrm.cp_nodes) { return false; }
        if(this.data.crrm.ct_nodes) { this.move_node(this.data.crrm.ct_nodes, obj); this.data.crrm.ct_nodes = false; }
        if(this.data.crrm.cp_nodes) { this.move_node(this.data.crrm.cp_nodes, obj, false, true); }
        this.__callback({ "obj" : obj, "nodes" : nodes });
      }
    }
  });
  // include the crr plugin by default
  // $.jstree.defaults.plugins.push("crrm");
})(jQuery);

/*
* jsTree themes plugin
* Handles loading and setting themes, as well as detecting path to themes, etc.
*/
(function ($) {
  // this variable stores the path to the themes folder - if left as false - it will be autodetected
  $.jstree._themes = false;
  $.jstree.plugin("themes", {
    __init : function () {
      this.get_container()
        .bind("init.jstree", $.proxy(function () {
            var s = this._get_settings().themes;
            this.data.themes.dots = s.dots;
            this.data.themes.icons = s.icons;
            this.set_theme(s.theme, s.url);
          }, this))
        .bind("loaded.jstree", $.proxy(function () {
            // bound here too, as simple HTML tree's won't honor dots & icons otherwise
            if(!this.data.themes.dots) { this.hide_dots(); }
            else { this.show_dots(); }
            if(!this.data.themes.icons) { this.hide_icons(); }
            else { this.show_icons(); }
          }, this));
    },
    defaults : {
      theme : "default",
      url : false,
      dots : true,
      icons : true
    },
    _fn : {
      set_theme : function (theme_name, theme_url) {
        if(!theme_name) { return false; }
        if(!theme_url) { theme_url = $.jstree._themes + theme_name + '/style.css'; }
        if(this.data.themes.theme != theme_name) {
          this.get_container().removeClass('jstree-' + this.data.themes.theme);
          this.data.themes.theme = theme_name;
        }
        this.get_container().addClass('jstree-' + theme_name);
        if(!this.data.themes.dots) { this.hide_dots(); }
        else { this.show_dots(); }
        if(!this.data.themes.icons) { this.hide_icons(); }
        else { this.show_icons(); }
        this.__callback();
      },
      get_theme : function () { return this.data.themes.theme; },

      show_dots : function () { this.data.themes.dots = true; this.get_container().children("ul").removeClass("jstree-no-dots"); },
      hide_dots : function () { this.data.themes.dots = false; this.get_container().children("ul").addClass("jstree-no-dots"); },
      toggle_dots : function () { if(this.data.themes.dots) { this.hide_dots(); } else { this.show_dots(); } },

      show_icons  : function () { this.data.themes.icons = true; this.get_container().children("ul").removeClass("jstree-no-icons"); },
      hide_icons  : function () { this.data.themes.icons = false; this.get_container().children("ul").addClass("jstree-no-icons"); },
      toggle_icons: function () { if(this.data.themes.icons) { this.hide_icons(); } else { this.show_icons(); } }
    }
  });
  // autodetect themes path
  $(function () {
    if($.jstree._themes === false) {
      $("script").each(function () {
        if(this.src.toString().match(/jquery\.jstree[^\/]*?\.js(\?.*)?$/)) {
          $.jstree._themes = this.src.toString().replace(/jquery\.jstree[^\/]*?\.js(\?.*)?$/, "") + 'themes/';
          return false;
        }
      });
    }
    if($.jstree._themes === false) { $.jstree._themes = "themes/"; }
  });
  // include the themes plugin by default
  $.jstree.defaults.plugins.push("themes");
})(jQuery);

/*
* jsTree hotkeys plugin
* Enables keyboard navigation for all tree instances
* Depends on the jstree ui & jquery hotkeys plugins
*/
(function ($) {
  var bound = [];
  function exec(i, event) {
    var f = this, tmp;
    if(f && f.data && f.data.hotkeys && f.data.hotkeys.enabled) {
      tmp = f._get_settings().hotkeys[i];
      if(tmp) { return tmp.call(f, event); }
    }
  }
  $.jstree.plugin("hotkeys", {
      __init: function () {
          var self = this;
            var container = this.get_container();
          container.attr('tabIndex', '0');
          container.on('focus', function () {
              self.get_container().attr('tabIndex', '-1');
              if (self.get_container().find('.jstree-focus').length == 0) {
                  var firstNode = self.get_container().find('a:visible').first();
                  self.focus_node(firstNode);
              }
          });
      if(typeof $.hotkeys === "undefined") { throw "jsTree hotkeys: jQuery hotkeys plugin not included."; }
      if (!this.data.ui) { throw "jsTree hotkeys: jsTree UI plugin not included."; }
      var hook = function (node) {
          var self = this;
          node.off("keydown");
          node.on("keydown", function (event) {
              var i;
                  switch (event.keyCode) {
                      case $.ui.keyCode.LEFT:
                          i = "left";
                          break;
                      case $.ui.keyCode.RIGHT:
                          i = "right";
                          break;
                      case $.ui.keyCode.UP:
                          i = "up";
                          break;
                      case $.ui.keyCode.DOWN:
                          i = "down";
                          break;
                      case $.ui.keyCode.SPACE:
                          i = "space";
                          break;
                  }
                return exec.call(self, i, event);
              });
      };
      //$.each(this._get_settings().hotkeys, function (i, v) {
      //  if(v !== false && $.inArray(i, bound) == -1) {
      var self = this;
      this.get_container().bind("select_node.jstree", function (event, args) { return hook.call(self, $(args.args[0])); });
      this.get_container().bind("focus_node.jstree", function (event, args) { return hook.call(self, $(args.args[0])); });
      this.get_container().bind("defocus_node.jstree", function (event, args) { return $(args.args[0]).off("keydown"); });
          //    bound.push(i);
      //  }
      //});
      this.get_container()
        .bind("lock.jstree", $.proxy(function () {
            if(this.data.hotkeys.enabled) { this.data.hotkeys.enabled = false; this.data.hotkeys.revert = true; }
          }, this))
        .bind("unlock.jstree", $.proxy(function () {
            if(this.data.hotkeys.revert) { this.data.hotkeys.enabled = true; }
          }, this));
      this.enable_hotkeys();
    },
    defaults : {
      "up" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.focus_node(this._get_prev(o));
        return false;
      },
      "ctrl+up" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.focus_node(this._get_prev(o));
        return false;
      },
      "shift+up" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.focus_node(this._get_prev(o));
        return false;
      },
      "down" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.focus_node(this._get_next(o));
        return false;
      },
      "ctrl+down" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.focus_node(this._get_next(o));
        return false;
      },
      "shift+down" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.focus_node(this._get_next(o));
        return false;
      },
      "left" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o) {
          if(o.hasClass("jstree-open")) { this.close_node(o); }
          else { this.focus_node(this._get_prev(o)); }
        }
        return false;
      },
      "ctrl+left" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o) {
          if(o.hasClass("jstree-open")) { this.close_node(o); }
          else { this.focus_node(this._get_prev(o)); }
        }
        return false;
      },
      "shift+left" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o) {
          if(o.hasClass("jstree-open")) { this.close_node(o); }
          else { this.focus_node(this._get_prev(o)); }
        }
        return false;
      },
      "right" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o && o.length) {
          if(o.hasClass("jstree-closed")) { this.open_node(o); }
          else { this.focus_node(this._get_next(o)); }
        }
        return false;
      },
      "ctrl+right" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o && o.length) {
          if(o.hasClass("jstree-closed")) { this.open_node(o); }
          else { this.focus_node(this._get_next(o)); }
        }
        return false;
      },
      "shift+right" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o && o.length) {
          if(o.hasClass("jstree-closed")) { this.open_node(o); }
          else { this.focus_node(this._get_next(o)); }
        }
        return false;
      },
      "space" : function () {
        if(this.data.ui.hovered) { this.data.ui.hovered.children("a:eq(0)").click(); }
        return false;
      },
      "ctrl+space" : function (event) {
        event.type = "click";
        if(this.data.ui.hovered) { this.data.ui.hovered.children("a:eq(0)").trigger(event); }
        return false;
      },
      "shift+space" : function (event) {
        event.type = "click";
        if(this.data.ui.hovered) { this.data.ui.hovered.children("a:eq(0)").trigger(event); }
        return false;
      },
      "f2" : function () { this.rename(this.data.ui.hovered || this.data.ui.last_selected); },
      "del" : function () { this.remove(this.data.ui.hovered || this._get_node(null)); }
    },
    _fn : {
      enable_hotkeys : function () {
        this.data.hotkeys.enabled = true;
      },
      disable_hotkeys : function () {
        this.data.hotkeys.enabled = false;
      }
    }
  });

  // include the hotkeys plugin by default
  $.jstree.defaults.plugins.push("hotkeys");
})(jQuery);

/*
* jsTree JSON plugin
* The JSON data store. Datastores are build by overriding the `load_node` and `_is_loaded` functions.
*/
(function ($) {
  $.jstree.plugin("json_data", {
    __init : function() {
      var s = this._get_settings().json_data;
      if(s.progressive_unload) {
        this.get_container().bind("after_close.jstree", function (e, data) {
          data.rslt.obj.children("ul").remove();
        });
      }
    },
    defaults : {
      // `data` can be a function:
      //  * accepts two arguments - node being loaded and a callback to pass the result to
      //  * will be executed in the current tree's scope & ajax won't be supported
      data : false,
      ajax : false,
      correct_state : true,
      progressive_render : false,
      progressive_unload : false
    },
    _fn : {
      load_node : function (obj, s_call, e_call) { var _this = this; this.load_node_json(obj, function () { _this.__callback({ "obj" : _this._get_node(obj) }); s_call.call(this); }, e_call); },
      _is_loaded : function (obj) {
        var s = this._get_settings().json_data;
        obj = this._get_node(obj);
        return obj == -1 || !obj || (!s.ajax && !s.progressive_render && !$.isFunction(s.data)) || obj.is(".jstree-open, .jstree-leaf") || obj.children("ul").children("li").length > 0;
      },
      refresh : function (obj) {
        obj = this._get_node(obj);
        var s = this._get_settings().json_data;
        if(obj && obj !== -1 && s.progressive_unload && ($.isFunction(s.data) || !!s.ajax)) {
          obj.removeData("jstree_children");
        }
        return this.__call_old();
      },
      load_node_json : function (obj, s_call, e_call) {
        var s = this.get_settings().json_data, d,
          error_func = function () {},
          success_func = function () {};
        obj = this._get_node(obj);

        if(obj && obj !== -1 && (s.progressive_render || s.progressive_unload) && !obj.is(".jstree-open, .jstree-leaf") && obj.children("ul").children("li").length === 0 && obj.data("jstree_children")) {
          d = this._parse_json(obj.data("jstree_children"), obj);
          if(d) {
            obj.append(d);
            if(!s.progressive_unload) { obj.removeData("jstree_children"); }
          }
          this.clean_node(obj);
          if(s_call) { s_call.call(this); }
          return;
        }

        if(obj && obj !== -1) {
          if(obj.data("jstree_is_loading")) { return; }
          else { obj.data("jstree_is_loading",true); }
        }
        switch(!0) {
          case (!s.data && !s.ajax): throw "Neither data nor ajax settings supplied.";
          // function option added here for easier model integration (also supporting async - see callback)
          case ($.isFunction(s.data)):
            s.data.call(this, obj, $.proxy(function (d) {
              d = this._parse_json(d, obj);
              if(!d) {
                if(obj === -1 || !obj) {
                  if(s.correct_state) { this.get_container().children("ul").empty(); }
                }
                else {
                  obj.children("a.jstree-loading").removeClass("jstree-loading");
                  obj.removeData("jstree_is_loading");
                  if(s.correct_state) { this.correct_state(obj); }
                }
                if(e_call) { e_call.call(this); }
              }
              else {
                if(obj === -1 || !obj) { this.get_container().children("ul").empty().append(d.children()); }
                else { obj.append(d).children("a.jstree-loading").removeClass("jstree-loading"); obj.removeData("jstree_is_loading"); }
                this.clean_node(obj);
                if(s_call) { s_call.call(this); }
              }
            }, this));
            break;
          case (!!s.data && !s.ajax) || (!!s.data && !!s.ajax && (!obj || obj === -1)):
            if(!obj || obj == -1) {
              d = this._parse_json(s.data, obj);
              if(d) {
                this.get_container().children("ul").empty().append(d.children());
                this.clean_node();
              }
              else {
                if(s.correct_state) { this.get_container().children("ul").empty(); }
              }
            }
            if(s_call) { s_call.call(this); }
            break;
          case (!s.data && !!s.ajax) || (!!s.data && !!s.ajax && obj && obj !== -1):
            error_func = function (x, t, e) {
              var ef = this.get_settings().json_data.ajax.error,
                errortext = "";

              if(ef) { errortext = ef.call(this, x, t, e); }
              if(obj != -1 && obj.length) {
                obj.children("a.jstree-loading").removeClass("jstree-loading");
                obj.removeData("jstree_is_loading");
                if(t === "success" && s.correct_state) { this.correct_state(obj); }
              }
              else {
                if(t === "success" && s.correct_state) { this.get_container().children("ul").empty(); }
              }
              if(obj == -1) { //tree completely failed loading show a message
                this.get_container().find(".jstree-last .jstree-loading").removeClass("jstree-loading").html((errortext==undefined ? "" :errortext)); //.remove();
              }
              if(e_call) { e_call.call(this); }
            };
            success_func = function (d, t, x) {
              var sf = this.get_settings().json_data.ajax.success;
              if(sf) { d = sf.call(this,d,t,x) || d; }
              if(d === "" || (d && d.toString && d.toString().replace(/^[\s\n]+$/,"") === "") || (!$.isArray(d) && !$.isPlainObject(d))) {
                return error_func.call(this, x, t, "");
              }
              d = this._parse_json(d, obj);
              if(d) {
                if(obj === -1 || !obj) { this.get_container().children("ul").empty().append(d.children()); }
                else { obj.append(d).children("a.jstree-loading").removeClass("jstree-loading"); obj.removeData("jstree_is_loading"); }
                this.clean_node(obj);
                if(s_call) { s_call.call(this); }
              }
              else {
                if(obj === -1 || !obj) {
                  if(s.correct_state) {
                    this.get_container().children("ul").empty();
                    if(s_call) { s_call.call(this); }
                  }
                }
                else {
                  obj.children("a.jstree-loading").removeClass("jstree-loading");
                  obj.removeData("jstree_is_loading");
                  if(s.correct_state) {
                    this.correct_state(obj);
                    if(s_call) { s_call.call(this); }
                  }
                }
              }
            };
            s.ajax.context = this;
            s.ajax.error = error_func;
            s.ajax.success = success_func;
            if(!s.ajax.dataType) { s.ajax.dataType = "json"; }
            if($.isFunction(s.ajax.url)) { s.ajax.url = s.ajax.url.call(this, obj); }
            if($.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this, obj); }
            $.ajax(s.ajax);
            break;
        }
      },
      _parse_json : function (js, obj, is_callback) {
        var d = false,
          p = this._get_settings(),
          s = p.json_data,
          t = p.core.html_titles,
          tmp, i, j, ul1, ul2;

        if(!js) { return d; }
        if(s.progressive_unload && obj && obj !== -1) {
          obj.data("jstree_children", d);
        }
        if($.isArray(js)) {
          d = $('<ul>');
          if(!js.length) { return false; }
          for(i = 0, j = js.length; i < j; i++) {
            tmp = this._parse_json(js[i], obj, true);
            if(tmp.length) {
              d = d.append(tmp);
            }
          }
          d = d.children();
        }
        else {
          if(typeof js == "string") { js = { data : js }; }
          if(!js.data && js.data !== "") { return d; }
          d = $("<li />");
          if(js.attr) { d.attr(js.attr); }
          if(js.metadata) { d.data(js.metadata); }
          if(js.state) { d.addClass("jstree-" + js.state); }
          if(!$.isArray(js.data)) { tmp = js.data; js.data = []; js.data.push(tmp); }
          $.each(js.data, function (i, m) {
            tmp = $("<a tabIndex='-1'/>");
            if($.isFunction(m)) { m = m.call(this, js); }
            if(typeof m == "string") { tmp.attr('href','#')[ t ? "html" : "text" ](m); }
            else {
              if(!m.attr) { m.attr = {}; }
              if(!m.attr.href) { m.attr.href = '#'; }
              tmp.attr(m.attr)[ t ? "html" : "text" ](m.title);
              if(m.language) { tmp.addClass(m.language); }
            }
            tmp.prepend("<ins class='jstree-icon'><span>&#160;</span></ins>");
            if(!m.icon && js.icon) { m.icon = js.icon; }
            if(m.icon) {
              if(m.icon.indexOf("/") === -1) { tmp.children("ins").addClass(m.icon); }
              else { tmp.children("ins").css("background","url('" + m.icon + "') center center no-repeat"); }
            }
            d.append(tmp);
          });
          d.prepend("<ins class='jstree-icon'><span>&#160;</span></ins>");
          if(js.children) {
            if(s.progressive_render && js.state !== "open") {
              d.addClass("jstree-closed").data("jstree_children", js.children);
            }
            else {
              if(s.progressive_unload) { d.data("jstree_children", js.children); }
              if($.isArray(js.children) && js.children.length) {
                tmp = this._parse_json(js.children, obj, true);
                if(tmp.length) {
                  ul2 = $("<ul />");
                  ul2.append(tmp);
                  d.append(ul2);
                }
              }
            }
          }
        }
        if(!is_callback) {
          ul1 = $("<ul />");
          ul1.append(d);
          d = ul1;
        }
        return d;
      },
      get_json : function (obj, li_attr, a_attr, is_callback) {
        var result = [],
          s = this._get_settings(),
          _this = this,
          tmp1, tmp2, li, a, t, lang;
        obj = this._get_node(obj);
        if(!obj || obj === -1) { obj = this.get_container().find("> ul > li"); }
        li_attr = $.isArray(li_attr) ? li_attr : [ "id", "class" ];
        if(!is_callback && this.data.types) { li_attr.push(s.types.type_attr); }
        a_attr = $.isArray(a_attr) ? a_attr : [ ];

        obj.each(function () {
          li = $(this);
          tmp1 = { data : [] };
          if(li_attr.length) { tmp1.attr = { }; }
          $.each(li_attr, function (i, v) {
            tmp2 = li.attr(v);
            if(tmp2 && tmp2.length && tmp2.replace(/jstree[^ ]*/ig,'').length) {
              tmp1.attr[v] = (" " + tmp2).replace(/ jstree[^ ]*/ig,'').replace(/\s+$/ig," ").replace(/^ /,"").replace(/ $/,"");
            }
          });
          if(li.hasClass("jstree-open")) { tmp1.state = "open"; }
          if(li.hasClass("jstree-closed")) { tmp1.state = "closed"; }
          if(li.data()) { tmp1.metadata = li.data(); }
          a = li.children("a");
          a.each(function () {
            t = $(this);
            if(
              a_attr.length ||
              $.inArray("languages", s.plugins) !== -1 ||
              t.children("ins").get(0).style.backgroundImage.length ||
              (t.children("ins").get(0).className && t.children("ins").get(0).className.replace(/jstree[^ ]*|$/ig,'').length)
            ) {
              lang = false;
              if($.inArray("languages", s.plugins) !== -1 && $.isArray(s.languages) && s.languages.length) {
                $.each(s.languages, function (l, lv) {
                  if(t.hasClass(lv)) {
                    lang = lv;
                    return false;
                  }
                });
              }
              tmp2 = { attr : { }, title : _this.get_text(t, lang) };
              $.each(a_attr, function (k, z) {
                tmp2.attr[z] = (" " + (t.attr(z) || "")).replace(/ jstree[^ ]*/ig,'').replace(/\s+$/ig," ").replace(/^ /,"").replace(/ $/,"");
              });
              if($.inArray("languages", s.plugins) !== -1 && $.isArray(s.languages) && s.languages.length) {
                $.each(s.languages, function (k, z) {
                  if(t.hasClass(z)) { tmp2.language = z; return true; }
                });
              }
              if(t.children("ins").get(0).className.replace(/jstree[^ ]*|$/ig,'').replace(/^\s+$/ig,"").length) {
                tmp2.icon = t.children("ins").get(0).className.replace(/jstree[^ ]*|$/ig,'').replace(/\s+$/ig," ").replace(/^ /,"").replace(/ $/,"");
              }
              if(t.children("ins").get(0).style.backgroundImage.length) {
                tmp2.icon = t.children("ins").get(0).style.backgroundImage.replace("url(","").replace(")","");
              }
            }
            else {
              tmp2 = _this.get_text(t);
            }
            if(a.length > 1) { tmp1.data.push(tmp2); }
            else { tmp1.data = tmp2; }
          });
          li = li.find("> ul > li");
          if(li.length) { tmp1.children = _this.get_json(li, li_attr, a_attr, true); }
          result.push(tmp1);
        });
        return result;
      }
    }
  });
})(jQuery);

/*
* jsTree cookies plugin
* Stores the currently opened/selected nodes in a cookie and then restores them
* Depends on the jquery.cookie plugin
*/
(function ($) {
  $.jstree.plugin("cookies", {
    __init : function () {
      if(typeof $.cookie === "undefined") { throw "jsTree cookie: jQuery cookie plugin not included."; }

      var s = this._get_settings().cookies,
        tmp;
      if(!!s.save_loaded) {
        tmp = $.cookie(s.save_loaded);
        if(tmp && tmp.length) { this.data.core.to_load = tmp.split(","); }
      }
      if(!!s.save_opened) {
        tmp = $.cookie(s.save_opened);
        if(tmp && tmp.length) { this.data.core.to_open = tmp.split(","); }
      }
      if(!!s.save_selected) {
        tmp = $.cookie(s.save_selected);
        if(tmp && tmp.length && this.data.ui) { this.data.ui.to_select = tmp.split(","); }
      }
      this.get_container()
        .one( ( this.data.ui ? "reselect" : "reopen" ) + ".jstree", $.proxy(function () {
          this.get_container()
            .bind("open_node.jstree close_node.jstree select_node.jstree deselect_node.jstree", $.proxy(function (e) {
                if(this._get_settings().cookies.auto_save) { this.save_cookie((e.handleObj.namespace + e.handleObj.type).replace("jstree","")); }
              }, this));
        }, this));
    },
    defaults : {
      save_loaded   : "jstree_load",
      save_opened   : "jstree_open",
      save_selected : "jstree_select",
      auto_save   : true,
      cookie_options  : {}
    },
    _fn : {
      save_cookie : function (c) {
        if(this.data.core.refreshing) { return; }
        var s = this._get_settings().cookies;
        if(!c) { // if called manually and not by event
          if(s.save_loaded) {
            this.save_loaded();
            $.cookie(s.save_loaded, this.data.core.to_load.join(","), s.cookie_options);
          }
          if(s.save_opened) {
            this.save_opened();
            $.cookie(s.save_opened, this.data.core.to_open.join(","), s.cookie_options);
          }
          if(s.save_selected && this.data.ui) {
            this.save_selected();
            $.cookie(s.save_selected, this.data.ui.to_select.join(","), s.cookie_options);
          }
          return;
        }
        switch(c) {
          case "open_node":
          case "close_node":
            if(!!s.save_opened) {
              this.save_opened();
              $.cookie(s.save_opened, this.data.core.to_open.join(","), s.cookie_options);
            }
            if(!!s.save_loaded) {
              this.save_loaded();
              $.cookie(s.save_loaded, this.data.core.to_load.join(","), s.cookie_options);
            }
            break;
          case "select_node":
          case "deselect_node":
            if(!!s.save_selected && this.data.ui) {
              this.save_selected();
              $.cookie(s.save_selected, this.data.ui.to_select.join(","), s.cookie_options);
            }
            break;
        }
      }
    }
  });
  // include cookies by default
  $.jstree.defaults.plugins.push("cookies");
})(jQuery);

/*
* jsTree sort plugin
* Sorts items alphabetically (or using any other function)
*/
(function ($) {
  $.jstree.plugin("sort", {
    __init : function () {
      this.get_container()
        .bind("load_node.jstree", $.proxy(function (e, data) {
            var obj = this._get_node(data.rslt.obj);
            obj = obj === -1 ? this.get_container().children("ul") : obj.children("ul");
            this.sort(obj);
          }, this))
        .bind("rename_node.jstree create_node.jstree create.jstree", $.proxy(function (e, data) {
            this.sort(data.rslt.obj.parent());
          }, this))
        .bind("move_node.jstree", $.proxy(function (e, data) {
            var m = data.rslt.np == -1 ? this.get_container() : data.rslt.np;
            this.sort(m.children("ul"));
          }, this));
    },
    defaults : function (a, b) { return this.get_text(a) > this.get_text(b) ? 1 : -1; },
    _fn : {
      sort : function (obj) {
        var s = this._get_settings().sort,
          t = this;
        obj.append($.makeArray(obj.children("li")).sort($.proxy(s, t)));
        obj.find("> li > ul").each(function() { t.sort($(this)); });
        this.clean_node(obj);
      }
    }
  });
})(jQuery);

/*
* jsTree DND plugin
* Drag and drop plugin for moving/copying nodes
*/
(function ($) {
  var o = false,
    r = false,
    m = false,
    ml = false,
    sli = false,
    sti = false,
    dir1 = false,
    dir2 = false,
    last_pos = false;
  $.inforTree.dnd = {
    is_down : false,
    is_drag : false,
    helper : false,
    scroll_spd : 10,
    init_x : 0,
    init_y : 0,
    threshold : 5,
    helper_left : 5,
    helper_top : 10,
    user_data : {},

    drag_start : function (e, data, html) {
      if($.inforTree.dnd.is_drag) {
        //$.inforTree.drag_stop({});
        this.drag_stop({});
      }
      try {
        e.currentTarget.unselectable = "on";
        e.currentTarget.onselectstart = function() { return false; };
        if(e.currentTarget.style) { e.currentTarget.style.MozUserSelect = "none"; }
      } catch(err) { }
      $.inforTree.dnd.init_x = e.pageX;
      $.inforTree.dnd.init_y = e.pageY;
      $.inforTree.dnd.user_data = data;
      $.inforTree.dnd.is_down = true;
      $.inforTree.dnd.helper = $("<div id='vakata-dragged' />").html(html); //.fadeTo(10,0.25);
      $(document).bind("mousemove", $.inforTree.dnd.drag);
      $(document).bind("mouseup", $.inforTree.dnd.drag_stop);
      return false;
    },
    drag : function (e) {
      if(!$.inforTree.dnd.is_down) { return; }
      if(!$.inforTree.dnd.is_drag) {
        if(Math.abs(e.pageX - $.inforTree.dnd.init_x) > 5 || Math.abs(e.pageY - $.inforTree.dnd.init_y) > 5) {
          $.inforTree.dnd.helper.appendTo("body");
          $.inforTree.dnd.is_drag = true;
          $(document).triggerHandler("drag_start.inforTree", { "event" : e, "data" : $.inforTree.dnd.user_data });
        }
        else { return; }
      }

      // maybe use a scrolling parent element instead of document?
      if(e.type === "mousemove") { // thought of adding scroll in order to move the helper, but mouse poisition is n/a
        var d = $(document), t = d.scrollTop(), l = d.scrollLeft();
        if(e.pageY - t < 20) {
          if(sti && dir1 === "down") { clearInterval(sti); sti = false; }
          if(!sti) { dir1 = "up"; sti = setInterval(function () { $(document).scrollTop($(document).scrollTop() - $.inforTree.dnd.scroll_spd); }, 150); }
        }
        else {
          if(sti && dir1 === "up") { clearInterval(sti); sti = false; }
        }
        if($(window).height() - (e.pageY - t) < 20) {
          if(sti && dir1 === "up") { clearInterval(sti); sti = false; }
          if(!sti) { dir1 = "down"; sti = setInterval(function () { $(document).scrollTop($(document).scrollTop() + $.inforTree.dnd.scroll_spd); }, 150); }
        }
        else {
          if(sti && dir1 === "down") { clearInterval(sti); sti = false; }
        }

        if(e.pageX - l < 20) {
          if(sli && dir2 === "right") { clearInterval(sli); sli = false; }
          if(!sli) { dir2 = "left"; sli = setInterval(function () { $(document).scrollLeft($(document).scrollLeft() - $.inforTree.dnd.scroll_spd); }, 150); }
        }
        else {
          if(sli && dir2 === "left") { clearInterval(sli); sli = false; }
        }
        if($(window).width() - (e.pageX - l) < 20) {
          if(sli && dir2 === "left") { clearInterval(sli); sli = false; }
          if(!sli) { dir2 = "right"; sli = setInterval(function () { $(document).scrollLeft($(document).scrollLeft() + $.inforTree.dnd.scroll_spd); }, 150); }
        }
        else {
          if(sli && dir2 === "right") { clearInterval(sli); sli = false; }
        }
      }

      $.inforTree.dnd.helper.css({ left : (e.pageX + $.inforTree.dnd.helper_left) + "px", top : (e.pageY + $.inforTree.dnd.helper_top) + "px" });
      $(document).triggerHandler("drag.inforTree", { "event" : e, "data" : $.inforTree.dnd.user_data });
    },
    drag_stop : function (e) {
      if(sli) { clearInterval(sli); }
      if(sti) { clearInterval(sti); }
      $(document).unbind("mousemove", $.inforTree.dnd.drag);
      $(document).unbind("mouseup", $.inforTree.dnd.drag_stop);
      $(document).triggerHandler("drag_stop.inforTree", { "event" : e, "data" : $.inforTree.dnd.user_data });
      $.inforTree.dnd.helper.remove();
      $.inforTree.dnd.init_x = 0;
      $.inforTree.dnd.init_y = 0;
      $.inforTree.dnd.user_data = {};
      $.inforTree.dnd.is_down = false;
      $.inforTree.dnd.is_drag = false;
    }
  };
  $.jstree.plugin("dnd", {
    __init : function () {
      this.data.dnd = {
        active : false,
        after : false,
        inside : false,
        before : false,
        off : false,
        prepared : false,
        w : 0,
        to1 : false,
        to2 : false,
        cof : false,
        cw : false,
        ch : false,
        i1 : false,
        i2 : false,
        mto : false
      };
      this.addDragElements();
      //this.get_container().sortable({items: "li", forcePlaceHolder: true, axis: "y"});
      this.get_container()
        .bind("mouseenter.jstree", $.proxy(function (e) {
            if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree) {
              if(this.data.themes) {
                m.attr("class", "jstree-" + this.data.themes.theme);
                if(ml) { ml.attr("class", "jstree-" + this.data.themes.theme); }
                $.inforTree.dnd.helper.attr("class", "jstree-dnd-helper jstree-" + this.data.themes.theme);
              }
              if(e.currentTarget === e.target && $.inforTree.dnd.user_data.obj && $($.inforTree.dnd.user_data.obj).length && $($.inforTree.dnd.user_data.obj).parents(".jstree:eq(0)")[0] !== e.target) { // node should not be from the same tree
                var tr = $.jstree._reference(e.target), dc;
                if(tr.data.dnd.foreign) {
                  dc = tr._get_settings().dnd.drag_check.call(this, { "o" : o, "r" : tr.get_container(), is_root : true });
                  if(dc === true || dc.inside === true || dc.before === true || dc.after === true) {
                    $.inforTree.dnd.helper.children("ins").attr("class","jstree-ok");
                  }
                }
                else {
                  tr.prepare_move(o, tr.get_container(), "last");
                  if(tr.check_move()) {
                    $.inforTree.dnd.helper.children("ins").attr("class","jstree-ok");
                  }
                }
              }
            }
          }, this))
        .bind("mouseup.jstree", $.proxy(function (e) {
            //if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree && $(e.currentTarget).find("> ul > li").length === 0) {
            if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree && e.currentTarget === e.target && $.inforTree.dnd.user_data.obj && $($.inforTree.dnd.user_data.obj).length && $($.inforTree.dnd.user_data.obj).parents(".jstree:eq(0)")[0] !== e.target) { // node should not be from the same tree
              var tr = $.jstree._reference(e.currentTarget), dc;
              if(tr.data.dnd.foreign) {
                dc = tr._get_settings().dnd.drag_check.call(this, { "o" : o, "r" : tr.get_container(), is_root : true });
                if(dc === true || dc.inside === true || dc.before === true || dc.after === true) {
                  tr._get_settings().dnd.drag_finish.call(this, { "o" : o, "r" : tr.get_container(), is_root : true });
                }
              }
              else {
                tr.move_node(o, tr.get_container(), "last", e[tr._get_settings().dnd.copy_modifier + "Key"]);
              }
            }
          }, this))
        .bind("mouseleave.jstree", $.proxy(function (e) {
            if(e.relatedTarget && e.relatedTarget.id && e.relatedTarget.id === "jstree-marker-line") {
              return false;
            }
            if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree) {
              if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
              if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
              if(this.data.dnd.to1) { clearTimeout(this.data.dnd.to1); }
              if(this.data.dnd.to2) { clearTimeout(this.data.dnd.to2); }
              if($.inforTree.dnd.helper.children("ins").hasClass("jstree-ok")) {
                $.inforTree.dnd.helper.children("ins").attr("class","jstree-invalid");
              }
            }
          }, this))
        .bind("mousemove.jstree", $.proxy(function (e) {
            if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree) {
              var cnt = this.get_container()[0];

              // Horizontal scroll
              if(e.pageX + 24 > this.data.dnd.cof.left + this.data.dnd.cw) {
                if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
                this.data.dnd.i1 = setInterval($.proxy(function () { this.scrollLeft += $.inforTree.dnd.scroll_spd; }, cnt), 100);
              }
              else if(e.pageX - 24 < this.data.dnd.cof.left) {
                if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
                this.data.dnd.i1 = setInterval($.proxy(function () { this.scrollLeft -= $.inforTree.dnd.scroll_spd; }, cnt), 100);
              }
              else {
                if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
              }

              // Vertical scroll
              if(e.pageY + 24 > this.data.dnd.cof.top + this.data.dnd.ch) {
                if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
                this.data.dnd.i2 = setInterval($.proxy(function () { this.scrollTop += $.inforTree.dnd.scroll_spd; }, cnt), 100);
              }
              else if(e.pageY - 24 < this.data.dnd.cof.top) {
                if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
                this.data.dnd.i2 = setInterval($.proxy(function () { this.scrollTop -= $.inforTree.dnd.scroll_spd; }, cnt), 100);
              }
              else {
                if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
              }

            }
          }, this))
        .bind("scroll.jstree", $.proxy(function (e) {
            if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree && m && ml) {
              m.hide();
              ml.hide();
            }
          }, this))
        .delegate("a", "mousedown.jstree", $.proxy(function (e) {
            if(e.which === 1) {
              this.start_drag(e.currentTarget, e);
              return false;
            }
          }, this))
        .delegate("a", "mouseenter.jstree", $.proxy(function (e) {
            if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree) {
              this.dnd_enter(e.currentTarget);
            }
          }, this))
        .delegate("a", "mousemove.jstree", $.proxy(function (e) {
            if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree) {
              if(!r || !r.length || r.children("a")[0] !== e.currentTarget) {
                this.dnd_enter(e.currentTarget);
              }
              if(typeof this.data.dnd.off.top === "undefined") { this.data.dnd.off = $(e.target).offset(); }
              this.data.dnd.w = (e.pageY - (this.data.dnd.off.top || 0)) % this.data.core.li_height;
              if(this.data.dnd.w < 0) { this.data.dnd.w += this.data.core.li_height; }
              this.dnd_show();
            }
          }, this))
        .delegate("a", "mouseleave.jstree", $.proxy(function (e) {
            if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree) {
              if(e.relatedTarget && e.relatedTarget.id && e.relatedTarget.id === "jstree-marker-line") {
                return false;
              }
                if(m) { m.hide(); }
                if(ml) { ml.hide(); }

              this.data.dnd.mto = setTimeout(
                (function (t) { return function () { t.dnd_leave(e); }; })(this),
              0);
            }
          }, this))
        .delegate("a", "mouseup.jstree", $.proxy(function (e) {
            if($.inforTree.dnd.is_drag && $.inforTree.dnd.user_data.jstree) {
              this.dnd_finish(e);
            }
          }, this));

      $(document)
        .bind("drag_stop.inforTree", $.proxy(function () {
            if(this.data.dnd.to1) { clearTimeout(this.data.dnd.to1); }
            if(this.data.dnd.to2) { clearTimeout(this.data.dnd.to2); }
            if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
            if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
            this.data.dnd.after   = false;
            this.data.dnd.before  = false;
            this.data.dnd.inside  = false;
            this.data.dnd.off   = false;
            this.data.dnd.prepared  = false;
            this.data.dnd.w     = false;
            this.data.dnd.to1   = false;
            this.data.dnd.to2   = false;
            this.data.dnd.i1    = false;
            this.data.dnd.i2    = false;
            this.data.dnd.active  = false;
            this.data.dnd.foreign = false;
            if(m) { m.css({ "top" : "-2000px" }); }
            if(ml) { ml.css({ "top" : "-2000px" }); }
          }, this))
        .bind("drag_start.inforTree", $.proxy(function (e, data) {
            if(data.data.jstree) {
              var et = $(data.event.target);
              if(et.closest(".jstree").hasClass("jstree-" + this.get_index())) {
                this.dnd_enter(et);
              }
            }
          }, this));

      var s = this._get_settings().dnd;
      if(s.drag_target) {
        $(document)
          .delegate(s.drag_target, "mousedown.jstree-" + this.get_index(), $.proxy(function (e) {
            o = e.target;
            $.inforTree.dnd.drag_start(e, { jstree : true, obj : e.target }, "<ins class='jstree-icon'><span>&#160;</span></ins>" + $(e.target).text() );
            if(this.data.themes) {
              if(m) { m.attr("class", "jstree-" + this.data.themes.theme); }
              if(ml) { ml.attr("class", "jstree-" + this.data.themes.theme); }
              $.inforTree.dnd.helper.attr("class", "jstree-dnd-helper jstree-" + this.data.themes.theme);
            }
            $.inforTree.dnd.helper.children("ins").attr("class","jstree-invalid");
            var cnt = this.get_container();
            this.data.dnd.cof = cnt.offset();
            this.data.dnd.cw = parseInt(cnt.width(),10);
            this.data.dnd.ch = parseInt(cnt.height(),10);
            this.data.dnd.foreign = true;
          }, this));
      }
      if(s.drop_target) {
        $(document)
          .delegate(s.drop_target, "mouseenter.jstree-" + this.get_index(), $.proxy(function (e) {
              if(this.data.dnd.active && this._get_settings().dnd.drop_check.call(this, { "o" : o, "r" : $(e.target), "e" : e })) {
                $.inforTree.dnd.helper.children("ins").attr("class","jstree-ok");
              }
            }, this))
          .delegate(s.drop_target, "mousemove.jstree-" + this.get_index(), $.proxy(function (e) {
            if (this.data.dnd.active && this._get_settings().dnd.drop_check.call(this, { "o": o, "r": $(e.target), "e": e })) {
              if (!$.inforTree.dnd.helper.children("ins").hasClass("jstree-ok")) {
                $.inforTree.dnd.helper.children("ins").attr("class", "jstree-ok");
              }
            }
            }, this))
          .delegate(s.drop_target, "mouseleave.jstree-" + this.get_index(), $.proxy(function (e) {
              if(this.data.dnd.active) {
                $.inforTree.dnd.helper.children("ins").attr("class","jstree-invalid");
              }
            }, this))
          .delegate(s.drop_target, "mouseup.jstree-" + this.get_index(), $.proxy(function (e) {
              if(this.data.dnd.active && $.inforTree.dnd.helper.children("ins").hasClass("jstree-ok")) {
                this._get_settings().dnd.drop_finish.call(this, { "o" : o, "r" : $(e.target), "e" : e });
              }
            }, this));
      }
    },
    defaults : {
      copy_modifier : "ctrl",
      check_timeout : 100,
      open_timeout  : 500,
      drop_target   : ".jstree-drop",
      drop_check    : function (data) { return true; },
      drop_finish   : $.noop,
      drag_target   : ".jstree-draggable",
      drag_finish   : $.noop,
      drag_check    : function (data) { return { after : false, before : false, inside : true }; }
    },
    _fn : {
      dnd_prepare : function () {
        if(!r || !r.length) { return; }
        this.data.dnd.off = r.offset();
        if(this._get_settings().core.rtl) {
          this.data.dnd.off.right = this.data.dnd.off.left + r.width();
        }
        if(this.data.dnd.foreign) {
          var a = this._get_settings().dnd.drag_check.call(this, { "o" : o, "r" : r });
          this.data.dnd.after = a.after;
          this.data.dnd.before = a.before;
          this.data.dnd.inside = a.inside;
          this.data.dnd.prepared = true;
          return this.dnd_show();
        }
        this.prepare_move(o, r, "before");
        this.data.dnd.before = this.check_move();
        this.prepare_move(o, r, "after");
        this.data.dnd.after = this.check_move();
        if(this._is_loaded(r)) {
          this.prepare_move(o, r, "inside");
          this.data.dnd.inside = this.check_move();
        }
        else {
          this.data.dnd.inside = false;
        }
        this.data.dnd.prepared = true;
        return this.dnd_show();
      },
      dnd_show : function () {
        if(!this.data.dnd.prepared) { return; }
        var o = ["before","inside","after"],
          r = false,
          rtl = this._get_settings().core.rtl,
          pos;
        if(this.data.dnd.w < this.data.core.li_height/3) { o = ["before","inside","after"]; }
        else if(this.data.dnd.w <= this.data.core.li_height*2/3) {
          o = this.data.dnd.w < this.data.core.li_height/2 ? ["inside","before","after"] : ["inside","after","before"];
        }
        else { o = ["after","inside","before"]; }
        $.each(o, $.proxy(function (i, val) {
          if(this.data.dnd[val]) {
            $.inforTree.dnd.helper.children("ins").attr("class","jstree-ok");
            r = val;
            return false;
          }
        }, this));
        if(r === false) { $.inforTree.dnd.helper.children("ins").attr("class","jstree-invalid"); }

        pos = rtl ? (this.data.dnd.off.right - 18) : (this.data.dnd.off.left + 10);
        switch(r) {
          case "before":
            m.css({ "left" : pos + "px", "top" : (this.data.dnd.off.top - 6) + "px" }).show();
            if(ml) { ml.css({ "left" : (pos + 8) + "px", "top" : (this.data.dnd.off.top - 1) + "px" }).show(); }
            break;
          case "after":
            m.css({ "left" : pos + "px", "top" : (this.data.dnd.off.top + this.data.core.li_height - 6) + "px" }).show();
            if(ml) { ml.css({ "left" : (pos + 8) + "px", "top" : (this.data.dnd.off.top + this.data.core.li_height - 1) + "px" }).show(); }
            break;
          case "inside":
            m.css({ "left" : pos + ( rtl ? -4 : 4) + "px", "top" : (this.data.dnd.off.top + this.data.core.li_height/2 - 5) + "px" }).show();
            if(ml) { ml.hide(); }
            break;
          default:
            m.hide();
            if(ml) { ml.hide(); }
            break;
        }
        last_pos = r;
        return r;
      },
      dnd_open : function () {
        this.data.dnd.to2 = false;
        this.open_node(r, $.proxy(this.dnd_prepare,this), true);
      },
      dnd_finish : function (e) {
        if(this.data.dnd.foreign) {
          if(this.data.dnd.after || this.data.dnd.before || this.data.dnd.inside) {
            this._get_settings().dnd.drag_finish.call(this, { "o" : o, "r" : r, "p" : last_pos });
          }
        }
        else {
          this.dnd_prepare();
          this.move_node(o, r, last_pos, e[this._get_settings().dnd.copy_modifier + "Key"]);
        }
        o = false;
        r = false;
        m.hide();
        if(ml) { ml.hide(); }
      },
      dnd_enter : function (obj) {
        if(this.data.dnd.mto) {
          clearTimeout(this.data.dnd.mto);
          this.data.dnd.mto = false;
        }
        var s = this._get_settings().dnd;
        this.data.dnd.prepared = false;
        r = this._get_node(obj);
        if(s.check_timeout) {
          // do the calculations after a minimal timeout (users tend to drag quickly to the desired location)
          if(this.data.dnd.to1) { clearTimeout(this.data.dnd.to1); }
          this.data.dnd.to1 = setTimeout($.proxy(this.dnd_prepare, this), s.check_timeout);
        }
        else {
          this.dnd_prepare();
        }
        if(s.open_timeout) {
          if(this.data.dnd.to2) { clearTimeout(this.data.dnd.to2); }
          if(r && r.length && r.hasClass("jstree-closed")) {
            // if the node is closed - open it, then recalculate
            this.data.dnd.to2 = setTimeout($.proxy(this.dnd_open, this), s.open_timeout);
          }
        }
        else {
          if(r && r.length && r.hasClass("jstree-closed")) {
            this.dnd_open();
          }
        }
      },
      dnd_leave : function (e) {
        this.data.dnd.after   = false;
        this.data.dnd.before  = false;
        this.data.dnd.inside  = false;
        $.inforTree.dnd.helper.children("ins").attr("class","jstree-invalid");
        $.inforTree.dnd.helper.attr("draggable","true");
        $.inforTree.dnd.helper.css("draggable","true");
        document.body.style.cursor = "no-drop";

        m.hide();
        if(ml) { ml.hide(); }
        if(r && r[0] === e.target.parentNode) {
          if(this.data.dnd.to1) {
            clearTimeout(this.data.dnd.to1);
            this.data.dnd.to1 = false;
          }
          if(this.data.dnd.to2) {
            clearTimeout(this.data.dnd.to2);
            this.data.dnd.to2 = false;
          }
        }
      },
      start_drag : function (obj, e) {
        o = this._get_node(obj);
        if(this.data.ui && this.is_selected(o)) { o = this._get_node(null, true); }
        var dt = o.length > 1 ? this._get_string("multiple_selection") : o.html(),
          cnt = this.get_container();

        $.inforTree.dnd.drag_start(e, { jstree : true, obj : o }, "<ins class='jstree-icon'><span>&#160;</span></ins>" + "<span class='jsTree'>" + dt +"</span>" );
        if(this.data.themes) {
          if(m) { m.attr("class", "jstree-" + this.data.themes.theme); }
          if(ml) { ml.attr("class", "jstree-" + this.data.themes.theme); }
          $.inforTree.dnd.helper.attr("class", "jstree-dnd-helper jstree-" + this.data.themes.theme);
        }
        this.data.dnd.cof = cnt.offset();
        this.data.dnd.cw = parseInt(cnt.width(),10);
        this.data.dnd.ch = parseInt(cnt.height(),10);
        this.data.dnd.active = true;
      },
      addDragElements : function() {
        api = this;
        m = $("<div />").attr({ id : "jstree-marker" }).hide().html("&raquo;")
          .bind("mouseleave mouseenter", function (e) {
            m.hide();
            ml.hide();
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
          })
          .appendTo("body");
          ml = $("<div />").attr({ id : "jstree-marker-line" }).hide()
          .bind("mouseup", function (e) {
            if(r && r.length) {
              r.children("a").trigger(e);
              api.dnd_finish(e);

              e.preventDefault();
              e.stopImmediatePropagation();
              return false;
            }
          })
          .bind("mouseleave", function (e) {
            var rt = $(e.relatedTarget);
            if(rt.is(".jstree") || rt.closest(".jstree").length === 0) {
              if(r && r.length) {
                r.children("a").trigger(e);
                m.hide();
                ml.hide();
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
              }
            }
          })
          .appendTo("body");

        $(document).bind("drag_start.inforTree", function (e, data) {
          if(data.data.jstree) {
            m.show();
            if(ml)
              ml.show();
          }
        });
        $(document).bind("drag_stop.inforTree", function (e, data) {
          document.body.style.cursor = "";
          if(data.data.jstree) {
            m.hide();
            if(ml)
              ml.hide();
          }
        });
      }
    }
  });
})(jQuery);

/*
* jsTree checkbox plugin
* Inserts checkboxes in front of every node
* Depends on the ui plugin
*/
(function ($) {
  $.jstree.plugin("checkbox", {
    __init : function () {
      this.data.checkbox.noui = this._get_settings().checkbox.override_ui;
      if(this.data.ui && this.data.checkbox.noui) {
        this.select_node = this.deselect_node = this.deselect_all = $.noop;
        this.get_selected = this.get_checked;
      }

      this.get_container()
        .bind("open_node.jstree create_node.jstree clean_node.jstree refresh.jstree", $.proxy(function (e, data) {
            this._prepare_checkboxes(data.rslt.obj);
          }, this))
        .bind("loaded.jstree", $.proxy(function (e) {
            this._prepare_checkboxes();
          }, this))
        .delegate( (this.data.ui && this.data.checkbox.noui ? "a" : "ins.jstree-checkbox") , "click.jstree", $.proxy(function (e) {
            e.preventDefault();
            if(this._get_node(e.target).hasClass("jstree-checked")) { this.uncheck_node(e.target); }
            else { this.check_node(e.target); }
            if(this.data.ui && this.data.checkbox.noui) {
              this.save_selected();
              if(this.data.cookies) { this.save_cookie("select_node"); }
            }
            else {
              e.stopImmediatePropagation();
              return false;
            }
          }, this));
    },
    defaults : {
      override_ui : false,
      two_state : false,
      real_checkboxes : false,
      checked_parent_open : true,
      real_checkboxes_names : function (n) { return [ ("check_" + (n[0].id || Math.ceil(Math.random() * 10000))) , 1]; }
    },
    __destroy : function () {
      this.get_container()
        .find("input.jstree-real-checkbox").removeClass("jstree-real-checkbox").end()
        .find("ins.jstree-checkbox").remove();
    },
    _fn : {
      _checkbox_notify : function (n, data) {
        if(data.checked) {
          this.check_node(n, false);
        }
      },
      _prepare_checkboxes : function (obj) {
        obj = !obj || obj == -1 ? this.get_container().find("> ul > li") : this._get_node(obj);
        if(obj === false) { return; } // added for removing root nodes
        var c, _this = this, t, ts = this._get_settings().checkbox.two_state, rc = this._get_settings().checkbox.real_checkboxes, rcn = this._get_settings().checkbox.real_checkboxes_names;
        obj.each(function () {
          t = $(this);
          c = t.is("li") && (t.hasClass("jstree-checked") || (rc && t.children(":checked").length)) ? "jstree-checked" : "jstree-unchecked";
          t.find("li").andSelf().each(function () {
            var $t = $(this), nm;
            $t.children("a" + (_this.data.languages ? "" : ":eq(0)") ).not(":has(.jstree-checkbox)").prepend("<ins class='jstree-checkbox'>&#160;</ins>").parent().not(".jstree-checked, .jstree-unchecked").addClass( ts ? "jstree-unchecked" : c );
            if(rc) {
              if(!$t.children(":checkbox").length) {
                nm = rcn.call(_this, $t);
                $t.prepend("<input type='checkbox' class='jstree-real-checkbox' id='" + nm[0] + "' name='" + nm[0] + "' value='" + nm[1] + "' />");
              }
              else {
                $t.children(":checkbox").addClass("jstree-real-checkbox");
              }
            }
            if(!ts) {
              if(c === "jstree-checked" || $t.hasClass("jstree-checked") || $t.children(':checked').length) {
                $t.find("li").andSelf().addClass("jstree-checked").children(":checkbox").prop("checked", true);
              }
            }
            else {
              if($t.hasClass("jstree-checked") || $t.children(':checked').length) {
                $t.addClass("jstree-checked").children(":checkbox").prop("checked", true);
              }
            }
          });
        });
        if(!ts) {
          obj.find(".jstree-checked").parent().parent().each(function () { _this._repair_state(this); });
        }
      },
      change_state : function (obj, state) {
        obj = this._get_node(obj);
        var coll = false, rc = this._get_settings().checkbox.real_checkboxes;
        if(!obj || obj === -1) { return false; }
        state = (state === false || state === true) ? state : obj.hasClass("jstree-checked");
        if(this._get_settings().checkbox.two_state) {
          if(state) {
            obj.removeClass("jstree-checked").addClass("jstree-unchecked");
            if(rc) { obj.children(":checkbox").prop("checked", false); }
          }
          else {
            obj.removeClass("jstree-unchecked").addClass("jstree-checked");
            if(rc) { obj.children(":checkbox").prop("checked", true); }
          }
        }
        else {
          if(state) {
            coll = obj.find("li").andSelf();
            if(!coll.filter(".jstree-checked, .jstree-undetermined").length) { return false; }
            coll.removeClass("jstree-checked jstree-undetermined").addClass("jstree-unchecked");
            if(rc) { coll.children(":checkbox").prop("checked", false); }
          }
          else {
            coll = obj.find("li").andSelf();
            if(!coll.filter(".jstree-unchecked, .jstree-undetermined").length) { return false; }
            coll.removeClass("jstree-unchecked jstree-undetermined").addClass("jstree-checked");
            if(rc) { coll.children(":checkbox").prop("checked", true); }
            if(this.data.ui) { this.data.ui.last_selected = obj; }
            this.data.checkbox.last_selected = obj;
          }
          obj.parentsUntil(".jstree", "li").each(function () {
            var $this = $(this);
            if(state) {
              if($this.children("ul").children("li.jstree-checked, li.jstree-undetermined").length) {
                $this.parentsUntil(".jstree", "li").andSelf().removeClass("jstree-checked jstree-unchecked").addClass("jstree-undetermined");
                if(rc) { $this.parentsUntil(".jstree", "li").andSelf().children(":checkbox").prop("checked", false); }
                return false;
              }
              else {
                $this.removeClass("jstree-checked jstree-undetermined").addClass("jstree-unchecked");
                if(rc) { $this.children(":checkbox").prop("checked", false); }
              }
            }
            else {
              if($this.children("ul").children("li.jstree-unchecked, li.jstree-undetermined").length) {
                $this.parentsUntil(".jstree", "li").andSelf().removeClass("jstree-checked jstree-unchecked").addClass("jstree-undetermined");
                if(rc) { $this.parentsUntil(".jstree", "li").andSelf().children(":checkbox").prop("checked", false); }
                return false;
              }
              else {
                $this.removeClass("jstree-unchecked jstree-undetermined").addClass("jstree-checked");
                if(rc) { $this.children(":checkbox").prop("checked", true); }
              }
            }
          });
        }
        if(this.data.ui && this.data.checkbox.noui) { this.data.ui.selected = this.get_checked(); }
        this.__callback(obj);
        return true;
      },
      check_node : function (obj) {
        if(this.change_state(obj, false)) {
          obj = this._get_node(obj);
          if(this._get_settings().checkbox.checked_parent_open) {
            var t = this;
            obj.parents(".jstree-closed").each(function () { t.open_node(this, false, true); });
          }
          this.__callback({ "obj" : obj });
        }
      },
      uncheck_node : function (obj) {
        if(this.change_state(obj, true)) { this.__callback({ "obj" : this._get_node(obj) }); }
      },
      check_all : function () {
        var _this = this,
          coll = this._get_settings().checkbox.two_state ? this.get_container_ul().find("li") : this.get_container_ul().children("li");
        coll.each(function () {
          _this.change_state(this, false);
        });
        this.__callback();
      },
      uncheck_all : function () {
        var _this = this,
          coll = this._get_settings().checkbox.two_state ? this.get_container_ul().find("li") : this.get_container_ul().children("li");
        coll.each(function () {
          _this.change_state(this, true);
        });
        this.__callback();
      },

      is_checked : function(obj) {
        obj = this._get_node(obj);
        return obj.length ? obj.is(".jstree-checked") : false;
      },
      get_checked : function (obj, get_all) {
        obj = !obj || obj === -1 ? this.get_container() : this._get_node(obj);
        return get_all || this._get_settings().checkbox.two_state ? obj.find(".jstree-checked") : obj.find("> ul > .jstree-checked, .jstree-undetermined > ul > .jstree-checked");
      },
      get_unchecked : function (obj, get_all) {
        obj = !obj || obj === -1 ? this.get_container() : this._get_node(obj);
        return get_all || this._get_settings().checkbox.two_state ? obj.find(".jstree-unchecked") : obj.find("> ul > .jstree-unchecked, .jstree-undetermined > ul > .jstree-unchecked");
      },

      show_checkboxes : function () { this.get_container().children("ul").removeClass("jstree-no-checkboxes"); },
      hide_checkboxes : function () { this.get_container().children("ul").addClass("jstree-no-checkboxes"); },

      _repair_state : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return; }
        if(this._get_settings().checkbox.two_state) {
          obj.find('li').andSelf().not('.jstree-checked').removeClass('jstree-undetermined').addClass('jstree-unchecked').children(':checkbox').prop('checked', true);
          return;
        }
        var rc = this._get_settings().checkbox.real_checkboxes,
          a = obj.find("> ul > .jstree-checked").length,
          b = obj.find("> ul > .jstree-undetermined").length,
          c = obj.find("> ul > li").length;
        if(c === 0) { if(obj.hasClass("jstree-undetermined")) { this.change_state(obj, false); } }
        else if(a === 0 && b === 0) { this.change_state(obj, true); }
        else if(a === c) { this.change_state(obj, false); }
        else {
          obj.parentsUntil(".jstree","li").andSelf().removeClass("jstree-checked jstree-unchecked").addClass("jstree-undetermined");
          if(rc) { obj.parentsUntil(".jstree", "li").andSelf().children(":checkbox").prop("checked", false); }
        }
      },
      reselect : function () {
        if(this.data.ui && this.data.checkbox.noui) {
          var _this = this,
            s = this.data.ui.to_select;
          s = $.map($.makeArray(s), function (n) { return "#" + n.toString().replace(/^#/,"").replace(/\\\//g,"/").replace(/\//g,"\\\/").replace(/\\\./g,".").replace(/\./g,"\\.").replace(/\:/g,"\\:"); });
          this.deselect_all();
          $.each(s, function (i, val) { _this.check_node(val); });
          this.__callback();
        }
        else {
          this.__call_old();
        }
      },
      save_loaded : function () {
        var _this = this;
        this.data.core.to_load = [];
        this.get_container_ul().find("li.jstree-closed.jstree-undetermined").each(function () {
          if(this.id) { _this.data.core.to_load.push("#" + this.id); }
        });
      }
    }
  });
})(jQuery);

/*
* jsTree search plugin
* Enables both sync and async search on the tree
* DOES NOT WORK WITH JSON PROGRESSIVE RENDER
*/
(function ($) {
  $.expr[':'].jstree_contains = function(a,i,m){
    return (a.textContent || a.innerText || "").toLowerCase().indexOf(m[3].toLowerCase())>=0;
  };
  $.expr[':'].jstree_title_contains = function(a,i,m) {
    return (a.getAttribute("title") || "").toLowerCase().indexOf(m[3].toLowerCase())>=0;
  };
  $.jstree.plugin("search", {
    __init : function () {

      this.data.search.str = "";
      this.data.search.result = $();
      if(this._get_settings().search.show_only_matches) {
        this.get_container()
          .bind("search.jstree", function (e, data) {
            $(this).children("ul").find("li").hide().removeClass("jstree-last");
            data.rslt.nodes.parentsUntil(".jstree").andSelf().show()
              .filter("ul").each(function () { $(this).children("li:visible").eq(-1).addClass("jstree-last"); });
          })
          .bind("clear_search.jstree", function () {
            $(this).children("ul").find("li").css("display","").end().end().inforTree("clean_node", -1);
          });
      }
      this._setupSearchField();
    },
    __destroy : function () {
      var self = this,
        container = self.get_container();

      if (container.parent().is(".inforScrollableArea")) {
        container.parent().parent().find(".inforTreeSearch").remove();
      } else {
        container.parent().find(".inforTreeSearch").remove();
      }
    },
    defaults : {
      ajax : false,
      search_method : "jstree_contains", // for case insensitive - jstree_contains
      show_only_matches : true,
      case_insensitive: true
    },
    _fn : {
      _setupSearchField : function() {
        var self = this,
          container = self.get_container(),
          searchField = container.children(".inforTriggerField");

        if (searchField.length==0) {
          searchField = $('<input class="inforSearchField" type="text">');
          container.before(searchField);
        }
        self._handleSizeChange();

        $("#leftPane").resize(function() {
          self._handleSizeChange();
        });

        searchField
          .attr("placeholder",Globalize.localize("SearchTree"))
          .addClass("noTrackDirty")
          .inforSearchField({click:function(event){
            var term = searchField.val();
            self.search(term);
          },cancel:function(event){
            self.search("");
          }});

        searchField.closest(".inforTriggerField").find(".inforTriggerButton")
          .attr("title",Globalize.localize("Search"));

        searchField.closest(".inforTriggerField").addClass("inforTreeSearch");
      },
      _handleSizeChange : function() {
        var tree = this.get_container(),
          totalHeight = tree.offset().top+tree.height(),
          width;

        //tree.height($(window).height() - tree.offset().top);

        width = $("#leftPane").width()-55;
        if (width > 50)
          tree.parent().find(".inforSearchField").width(width);
      },
      search : function (str, skip_async) {
        if($.trim(str) === "") { this.clear_search(); return; }
        var s = this.get_settings().search,
          t = this,
          error_func = function () { },
          success_func = function () { };
        this.data.search.str = str;

        if(!skip_async && s.ajax !== false && this.get_container_ul().find("li.jstree-closed:not(:has(ul)):eq(0)").length > 0) {
          this.search.supress_callback = true;
          error_func = function () { };
          success_func = function (d, t, x) {
            var sf = this.get_settings().search.ajax.success;
            if(sf) { d = sf.call(this,d,t,x) || d; }
            this.data.search.to_open = d;
            this._search_open();
          };
          s.ajax.context = this;
          s.ajax.error = error_func;
          s.ajax.success = success_func;
          if($.isFunction(s.ajax.url)) { s.ajax.url = s.ajax.url.call(this, str); }
          if($.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this, str); }
          if(!s.ajax.data) { s.ajax.data = { "search_string" : str }; }
          if(!s.ajax.dataType || /^json/.exec(s.ajax.dataType)) { s.ajax.dataType = "json"; }
          $.ajax(s.ajax);
          return;
        }
        if(this.data.search.result.length) { this.clear_search(); }
        this.data.search.result = this.get_container().find("a" + (this.data.languages ? "." + this.get_lang() : "" ) + ":" + (s.search_method) + "(" + this.data.search.str + ")");
        this.data.search.result.addClass("jstree-search").parent().parents(".jstree-closed").each(function () {
          t.open_node(this, false, true);
        });
        this.__callback({ nodes : this.data.search.result, str : str });

        this._handleSizeChange();
      },
      clear_search : function (str) {
        this.data.search.result.removeClass("jstree-search");
        this.__callback(this.data.search.result);
        this.data.search.result = $();
      },
      _search_open : function (is_callback) {
        var _this = this,
          done = true,
          current = [],
          remaining = [];
        if(this.data.search.to_open.length) {
          $.each(this.data.search.to_open, function (i, val) {
            if(val == "#") { return true; }
            if(_this._get_node(val)) { current.push(val); }
              else { remaining.push(val); }
          });
          if(current.length) {
            this.data.search.to_open = remaining;
            $.each(current, function (i, val) {
              _this.open_node(val, function () { _this._search_open(true); });
            });
            done = false;
          }
        }
        if(done) { this.search(this.data.search.str, true); }
      }
    }
  });

  // include the search plugin by default
  //.$.jstree.defaults.plugins.push("search");
})(jQuery);

/*
* jsTree HTML plugin
* The HTML data store. Datastores are build by replacing the `load_node` and `_is_loaded` functions.
*/
(function ($) {
  $.jstree.plugin("html_data", {
    __init : function () {
      // this used to use html() and clean the whitespace, but this way any attached data was lost
      this.data.html_data.original_container_html = this.get_container().find(" > ul > li").clone(true);
      // remove white space from LI node - otherwise nodes appear a bit to the right
      this.data.html_data.original_container_html.find("li").andSelf().contents().filter(function() { return this.nodeType == 3; }).remove();
    },
    defaults : {
      data : false,
      ajax : false,
      correct_state : true
    },
    _fn : {
      load_node : function (obj, s_call, e_call) { var _this = this; this.load_node_html(obj, function () { _this.__callback({ "obj" : _this._get_node(obj) }); s_call.call(this); }, e_call); },
      _is_loaded : function (obj) {
        obj = this._get_node(obj);
        return obj == -1 || !obj || (!this._get_settings().html_data.ajax && !$.isFunction(this._get_settings().html_data.data)) || obj.is(".jstree-open, .jstree-leaf") || obj.children("ul").children("li").size() > 0;
      },
      load_node_html : function (obj, s_call, e_call) {
        var d,
          s = this.get_settings().html_data,
          error_func = function () {},
          success_func = function () {};
        obj = this._get_node(obj);
        if(obj && obj !== -1) {
          if(obj.data("jstree_is_loading")) { return; }
          else { obj.data("jstree_is_loading",true); }
        }
        switch(!0) {
          case ($.isFunction(s.data)):
            s.data.call(this, obj, $.proxy(function (d) {
              if(d && d !== "" && d.toString && d.toString().replace(/^[\s\n]+$/,"") !== "") {
                d = $(d);
                if(!d.is("ul")) { d = $("<ul />").append(d); }
                if(obj == -1 || !obj) { this.get_container().children("ul").empty().append(d.children()).find("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'><span>&#160;</span></ins>").end().filter("a").children("ins:first-child").not(".jstree-icon").addClass("jstree-icon"); }
                else { obj.children("a.jstree-loading").removeClass("jstree-loading"); obj.append(d).children("ul").find("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'><span>&#160;</span></ins>").end().filter("a").children("ins:first-child").not(".jstree-icon").addClass("jstree-icon"); obj.removeData("jstree_is_loading"); }
                this.clean_node(obj);
                if(s_call) { s_call.call(this); }
              }
              else {
                if(obj && obj !== -1) {
                  obj.children("a.jstree-loading").removeClass("jstree-loading");
                  obj.removeData("jstree_is_loading");
                  if(s.correct_state) {
                    this.correct_state(obj);
                    if(s_call) { s_call.call(this); }
                  }
                }
                else {
                  if(s.correct_state) {
                    this.get_container().children("ul").empty();
                    if(s_call) { s_call.call(this); }
                  }
                }
              }
            }, this));
            break;
          case (!s.data && !s.ajax):
            if(!obj || obj == -1) {
              this.get_container()
                .children("ul").empty()
                .append(this.data.html_data.original_container_html)
                .find("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'><span>&#160;</span></ins>").end()
                .filter("a").children("ins:first-child").not(".jstree-icon").addClass("jstree-icon");
              this.clean_node();
            }
            if(s_call) { s_call.call(this); }
            break;
          case (!!s.data && !s.ajax) || (!!s.data && !!s.ajax && (!obj || obj === -1)):
            if(!obj || obj == -1) {
              d = $(s.data);
              if(!d.is("ul")) { d = $("<ul />").append(d); }
              this.get_container()
                .children("ul").empty().append(d.children())
                .find("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'><span>&#160;</span></ins>").end()
                .filter("a").children("ins:first-child").not(".jstree-icon").addClass("jstree-icon");
              this.clean_node();
            }
            if(s_call) { s_call.call(this); }
            break;
          case (!s.data && !!s.ajax) || (!!s.data && !!s.ajax && obj && obj !== -1):
            obj = this._get_node(obj);
            error_func = function (x, t, e) {
              var ef = this.get_settings().html_data.ajax.error;
              if(ef) { ef.call(this, x, t, e); }
              if(obj != -1 && obj.length) {
                obj.children("a.jstree-loading").removeClass("jstree-loading");
                obj.removeData("jstree_is_loading");
                if(t === "success" && s.correct_state) { this.correct_state(obj); }
              }
              else {
                if(t === "success" && s.correct_state) { this.get_container().children("ul").empty(); }
              }
              if(e_call) { e_call.call(this); }
            };
            success_func = function (d, t, x) {
              var sf = this.get_settings().html_data.ajax.success;
              if(sf) { d = sf.call(this,d,t,x) || d; }
              if(d === "" || (d && d.toString && d.toString().replace(/^[\s\n]+$/,"") === "")) {
                return error_func.call(this, x, t, "");
              }
              if(d) {
                d = $(d);
                if(!d.is("ul")) { d = $("<ul />").append(d); }
                if(obj == -1 || !obj) { this.get_container().children("ul").empty().append(d.children()).find("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'><span>&#160;</span></ins>").end().filter("a").children("ins:first-child").not(".jstree-icon").addClass("jstree-icon"); }
                else { obj.children("a.jstree-loading").removeClass("jstree-loading"); obj.append(d).children("ul").find("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'><span>&#160;</span></ins>").end().filter("a").children("ins:first-child").not(".jstree-icon").addClass("jstree-icon"); obj.removeData("jstree_is_loading"); }
                this.clean_node(obj);
                if(s_call) { s_call.call(this); }
              }
              else {
                if(obj && obj !== -1) {
                  obj.children("a.jstree-loading").removeClass("jstree-loading");
                  obj.removeData("jstree_is_loading");
                  if(s.correct_state) {
                    this.correct_state(obj);
                    if(s_call) { s_call.call(this); }
                  }
                }
                else {
                  if(s.correct_state) {
                    this.get_container().children("ul").empty();
                    if(s_call) { s_call.call(this); }
                  }
                }
              }
            };
            s.ajax.context = this;
            s.ajax.error = error_func;
            s.ajax.success = success_func;
            if(!s.ajax.dataType) { s.ajax.dataType = "html"; }
            if($.isFunction(s.ajax.url)) { s.ajax.url = s.ajax.url.call(this, obj); }
            if($.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this, obj); }
            $.ajax(s.ajax);
            break;
        }
      }
    }
  });
  // include the json_data data plugin by default
  $.jstree.defaults.plugins.push("json_data");
})(jQuery);

/*
* jsTree types plugin
* Adds support types of nodes
* You can set an attribute on each li node, that represents its type.
* According to the type setting the node may get custom icon/validation rules
*/
(function ($) {
  $.jstree.plugin("types", {
    __init : function () {
      var s = this._get_settings().types;
      this.data.types.attach_to = [];
      this.get_container()
        .bind("init.jstree", $.proxy(function () {
            var types = s.types,
              attr  = s.type_attr,
              icons_css = "",
              _this = this;

            $.each(types, function (i, tp) {
              $.each(tp, function (k, v) {
                if(!/^(max_depth|max_children|icon|valid_children)$/.test(k)) { _this.data.types.attach_to.push(k); }
              });
              if(!tp.icon) { return true; }
              if( tp.icon.image || tp.icon.position) {
                if(i == "default")  { icons_css += '.jstree-' + _this.get_index() + ' a > .jstree-icon { '; }
                else        { icons_css += '.jstree-' + _this.get_index() + ' li[' + attr + '="' + i + '"] > a > .jstree-icon { '; }
                if(tp.icon.image) { icons_css += ' background-image:url(' + tp.icon.image + '); '; }
                if(tp.icon.position){ icons_css += ' background-position:' + tp.icon.position + '; '; }
                else        { icons_css += ' background-position:0 0; '; }
                icons_css += '} ';
              }
            });

          }, this))
        .bind("before.jstree", $.proxy(function (e, data) {
            var s, t,
              o = this._get_settings().types.use_data ? this._get_node(data.args[0]) : false,
              d = o && o !== -1 && o.length ? o.data("jstree") : false;
            if(d && d.types && d.types[data.func] === false) { e.stopImmediatePropagation(); return false; }
            if($.inArray(data.func, this.data.types.attach_to) !== -1) {
              if(!data.args[0] || (!data.args[0].tagName && !data.args[0].jquery)) { return; }
              s = this._get_settings().types.types;
              t = this._get_type(data.args[0]);
              if(
                (
                  (s[t] && typeof s[t][data.func] !== "undefined") ||
                  (s["default"] && typeof s["default"][data.func] !== "undefined")
                ) && this._check(data.func, data.args[0]) === false
              ) {
                e.stopImmediatePropagation();
                return false;
              }
            }
          }, this));
    },
    defaults : {
      // defines maximum number of root nodes (-1 means unlimited, -2 means disable max_children checking)
      max_children    : -1,
      // defines the maximum depth of the tree (-1 means unlimited, -2 means disable max_depth checking)
      max_depth     : -1,
      // defines valid node types for the root nodes
      valid_children    : "all",

      // whether to use $.data
      use_data : false,
      // where is the type stores (the rel attribute of the LI element)
      type_attr : "rel",
      // a list of types
      types : {
        // the default type
        "default" : {
          "max_children"  : -1,
          "max_depth"   : -1,
          "valid_children": "all"

          // Bound functions - you can bind any other function here (using boolean or function)
          //"select_node" : true
        }
      }
    },
    _fn : {
      _types_notify : function (n, data) {
        if(data.type && this._get_settings().types.use_data) {
          this.set_type(data.type, n);
        }
      },
      _get_type : function (obj) {
        obj = this._get_node(obj);
        return (!obj || !obj.length) ? false : obj.attr(this._get_settings().types.type_attr) || "default";
      },
      set_type : function (str, obj) {
        obj = this._get_node(obj);
        var ret = (!obj.length || !str) ? false : obj.attr(this._get_settings().types.type_attr, str);
        if(ret) { this.__callback({ obj : obj, type : str}); }
        return ret;
      },
      _check : function (rule, obj, opts) {
        obj = this._get_node(obj);
        var v = false, t = this._get_type(obj), d = 0, _this = this, s = this._get_settings().types, data = false;
        if(obj === -1) {
          if(!!s[rule]) { v = s[rule]; }
          else { return; }
        }
        else {
          if(t === false) { return; }
          data = s.use_data ? obj.data("jstree") : false;
          if(data && data.types && typeof data.types[rule] !== "undefined") { v = data.types[rule]; }
          else if(!!s.types[t] && typeof s.types[t][rule] !== "undefined") { v = s.types[t][rule]; }
          else if(!!s.types["default"] && typeof s.types["default"][rule] !== "undefined") { v = s.types["default"][rule]; }
        }
        if($.isFunction(v)) { v = v.call(this, obj); }
        if(rule === "max_depth" && obj !== -1 && opts !== false && s.max_depth !== -2 && v !== 0) {
          // also include the node itself - otherwise if root node it is not checked
          obj.children("a:eq(0)").parentsUntil(".jstree","li").each(function (i) {
            // check if current depth already exceeds global tree depth
            if(s.max_depth !== -1 && s.max_depth - (i + 1) <= 0) { v = 0; return false; }
            d = (i === 0) ? v : _this._check(rule, this, false);
            // check if current node max depth is already matched or exceeded
            if(d !== -1 && d - (i + 1) <= 0) { v = 0; return false; }
            // otherwise - set the max depth to the current value minus current depth
            if(d >= 0 && (d - (i + 1) < v || v < 0) ) { v = d - (i + 1); }
            // if the global tree depth exists and it minus the nodes calculated so far is less than `v` or `v` is unlimited
            if(s.max_depth >= 0 && (s.max_depth - (i + 1) < v || v < 0) ) { v = s.max_depth - (i + 1); }
          });
        }
        return v;
      },
      check_move : function () {
        if(!this.__call_old()) { return false; }
        var m  = this._get_move(),
          s  = m.rt._get_settings().types,
          mc = m.rt._check("max_children", m.cr),
          md = m.rt._check("max_depth", m.cr),
          vc = m.rt._check("valid_children", m.cr),
          ch = 0, d = 1, t;

        if(vc === "none") { return false; }
        if($.isArray(vc) && m.ot && m.ot._get_type) {
          m.o.each(function () {
            if($.inArray(m.ot._get_type(this), vc) === -1) { d = false; return false; }
          });
          if(d === false) { return false; }
        }
        if(s.max_children !== -2 && mc !== -1) {
          ch = m.cr === -1 ? this.get_container().find("> ul > li").not(m.o).length : m.cr.find("> ul > li").not(m.o).length;
          if(ch + m.o.length > mc) { return false; }
        }
        if(s.max_depth !== -2 && md !== -1) {
          d = 0;
          if(md === 0) { return false; }
          if(typeof m.o.d === "undefined") {
            // TODO: deal with progressive rendering and async when checking max_depth (how to know the depth of the moved node)
            t = m.o;
            while(t.length > 0) {
              t = t.find("> ul > li");
              d ++;
            }
            m.o.d = d;
          }
          if(md - m.o.d < 0) { return false; }
        }
        return true;
      },
      create_node : function (obj, position, js, callback, is_loaded, skip_check) {
        if(!skip_check && (is_loaded || this._is_loaded(obj))) {
          var p  = (typeof position == "string" && position.match(/^before|after$/i) && obj !== -1) ? this._get_parent(obj) : this._get_node(obj),
            s  = this._get_settings().types,
            mc = this._check("max_children", p),
            md = this._check("max_depth", p),
            vc = this._check("valid_children", p),
            ch;
          if(typeof js === "string") { js = { data : js }; }
          if(!js) { js = {}; }
          if(vc === "none") { return false; }
          if($.isArray(vc)) {
            if(!js.attr || !js.attr[s.type_attr]) {
              if(!js.attr) { js.attr = {}; }
              js.attr[s.type_attr] = vc[0];
            }
            else {
              if($.inArray(js.attr[s.type_attr], vc) === -1) { return false; }
            }
          }
          if(s.max_children !== -2 && mc !== -1) {
            ch = p === -1 ? this.get_container().find("> ul > li").length : p.find("> ul > li").length;
            if(ch + 1 > mc) { return false; }
          }
          if(s.max_depth !== -2 && md !== -1 && (md - 1) < 0) { return false; }
        }
        return this.__call_old(true, obj, position, js, callback, is_loaded, skip_check);
      }
    }
  });
})(jQuery);

/*
* jsTree contextmenu plugin
*/
(function ($) {
  $.jstree.plugin("contextmenu", {
    __init : function () {
      var self = this;
      this.get_container()
        .delegate("a", "contextmenu.popupmenu", function (e) {
          e.preventDefault();
          return false;
        })
        .delegate("a", "mousedown.jstree", function (e) {
          if( e.button != 2 ) {
            return;
          }

          e.preventDefault();

          if(!$(e.currentTarget).hasClass("jstree-loading")) {
            self.show_contextmenu(e);
          }
        });
    },
    defaults : {
      select_node : true, // requires UI plugin
      items : { // Could be a function that should return an object like this one
        "create" : {
          "label"       : "Create",
          "action"      : function (tree) { tree.create(obj); }
        },
        "rename" : {
          "label"       : "Rename",
          "action"      : function (tree) { tree.rename(obj); }
        },
        "remove" : {
          "label"       : "Delete",
          "action"      : function (tree) { if(tree.is_selected(obj)) { tree.remove(); } else { tree.remove(obj); } }
        },
        "ccp" : {
          "label"       : "Edit",
          "action"      : false,
          "submenu" : {
            "cut" : {
              "label"       : "Cut",
              "action"      : function (tree) { tree.cut(obj); }
            },
            "copy" : {
              "icon"        : false,
              "label"       : "Copy",
              "action"      : function (tree) { tree.copy(obj); }
            },
            "paste" : {
              "icon"        : false,
              "label"       : "Paste",
              "action"      : function (tree) { tree.paste(obj); }
            }
          }
        }
      }
    },
    _fn : {
      show_contextmenu : function (e) {
        $('#inforTreeContextMenu').remove();
        obj = this._get_node(e.currentTarget);
        s = this.get_settings().contextmenu,
        menuItems = s.items;

        if (typeof menuItems == "function") {
          menuItems = menuItems(obj);
        }

        var self = this;

        if(s.select_node && this.data.ui && !this.is_selected(obj)) {
          this.deselect_all();
          this.select_node(obj, true);
        }

        // Check for an existing Context Menu, and remove it/close out related events.
        var existingPopupMenu = $('body').data('popupmenu');
        if (existingPopupMenu) {
          existingPopupMenu.element.off('selected');
          $('#inforTreeContextMenu').parent('.popupmenu-wrapper').off('contextmenu.popupmenu');
          existingPopupMenu.close();
        }

        this.data.contextmenu = true;

        // Build new menu markup.
        var menuHtml = $('<ul id="inforTreeContextMenu" class="popupmenu"></ul>').appendTo('body');

        for (var key in menuItems) {
          if (menuItems[key]==false || menuItems[key].label==undefined)
            continue;

          var a = $('<a href="#'+key+'">'+menuItems[key].label+'</a>');
          menuHtml.append($('<li></li>').append(a));

          //Add Submenu
          if (menuItems[key].submenu) {
            var ul = $('<ul class="popupmenu"></ul>');
            a.after(ul);
            for (var sub in menuItems[key].submenu) {
              var aa = $('<a></a>').text(menuItems[key].submenu[sub].label)
                        .attr("href","#"+key+"_"+sub);
              ul.append($('<li></li>').append(aa));
            }
          }
        }

        if ($('#inforTreeContextMenu').children().length === 0) {
          return;
        }

        $('body').popupmenu({
          menu: 'inforTreeContextMenu',
          trigger: 'immediate'
        }).on('close.popupmenu', function() {
          $(this).off('selected');
        }).on('destroy.popupmenu', function() {
          $(this).off('destroy.popupmenu');
          var menu = $("#inforTreeContextMenu");
          if (menu.parent().hasClass('popupmenu-wrapper')) {
            menu.parent().remove();
          } else {
            menu.remove();
          }
        }).on('selected', function(e, anchor) {
          $(this).off('selected');
          var id = anchor.attr('href').substr(1);
          if (id.indexOf("_")>-1)
            func = menuItems[id.substr(0,id.indexOf("_"))].submenu[id.substr(id.indexOf("_")+1)].action;
          else
            func = menuItems[id].action;

          if (func)
            func(self, menuItems[id]);
        });

        // PopupMenu plugin doesn't position "immediate"-ly triggered menus at the mouse cursor,
        // so we do it manually.
        var wrapper = $('#inforTreeContextMenu').parent();
        wrapper.css({ left: e.pageX, top: e.pageY }).on('contextmenu.popupmenu', function(e) {
          e.stopPropagation();
          e.preventDefault();
        });

        // Copy of the positioning calculation from the context menu plugin.
        // Needed here because we are performing a repositioning of the menu AFTER the position calculation
        // within the plugin itself has already run.
        var menuHeight = $('#inforTreeContextMenu').outerHeight();
        if ((wrapper.offset().top + menuHeight) > ($(window).height() + $(document).scrollTop())) {
          wrapper.css({'top': ($(window).height() + $(document).scrollTop()) - menuHeight});

          //Did it fit?
          if ((wrapper.offset().top - $(document).scrollTop()) < 0) {
            wrapper.css('top', 0);
            wrapper.css('top', $(document).scrollTop() + (wrapper.offset().top * -1));
            menuHeight = wrapper.outerHeight();
          }

          // Do one more check to see if the bottom edge bleeds off the screen.
          // If it does, shrink the menu's Y size.
          if ((wrapper.offset().top + menuHeight) > ($(window).height() + $(document).scrollTop())) {
            var differenceX = (wrapper.offset().top + menuHeight) - ($(window).height() + $(document).scrollTop());
            menuHeight = menuHeight - differenceX - 32;
            this.menu.height(menuHeight);
          }
        }
	  //Set focus to first item in menu
        wrapper.find('li:not(.separator):not(.group):not(.is-disabled)').first().find('a').focus();


      }
    }
  });
})(jQuery);
