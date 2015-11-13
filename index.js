var path = require('path');

var exports = module.exports = function(fis) {

  fis.set('system.localNPMFolder', path.join(__dirname, 'node_modules'));
  fis.require.prefixes.unshift('jello'); // 优先加载 jello 打头的插件。

  var weight = -100; // 此插件中，所有 match 默认的权重。
  var weightWithNs = -50; // 所有针对有 namespace 后设置的权重

  fis.set('namespace', '');
  fis.set('statics', '/static');
  fis.set('templates', '/WEB-INF/views');

  // 默认捆绑 jello 的服务器。
  // fis3 server start 可以不指定 type.
  fis.set('server.type', 'jello');

  // 开发环境配置
  fis

    // 挂载 amd 模块化插件。
    //
    // 如果要使用 amd 方案，请先执行
    // fis.unhook('amd');
    // 然后再执行 fis.hook('commonjs');
    // 多个模块化方案插件不能共用。
    .hook('amd', {
      packages: []
    }, weight)

    // 忽略目录和文件
    .set('project.ignore', [
      'node_modules/**',
      '.idea/**',
      '.git/**',
      'mtt-conf.js'
    ], weight)

    // 开发环境下都不加md5
    // 所有文件默认放 static 目录下面。
    // 后续会针对部分文件覆盖此配置。
    .match('**', {
      release: '${statics}/${namespace}/$0'
    }, weight)

    // static 下面的文件直接发布到 $statics 目录。
    // 为了不多一层目录 static。
    .match('/static/(**)', {
      release: '${statics}/${namespace}/$1',
      isMod: false
    }, weight)

    .match('/src/(**)', {
      release: '${statics}/${namespace}/$1'
    }, weight)

    // test 目录原封不动发过去。
    .match('/test/(**)', {
      release: '/test/${namespace}/$1',
      isMod: false,
      useCompile: false
    }, weight)

    // 页面配置，为了防止有两层view，这里去掉一层
    .match(/^\/views\/(.*\.(jsp|vm|html))$/i, {
      isMod: true,
      url: '$1',
      release: '${templates}/${namespace}/$1'
    }, weight)

    //page标记为isPage
    .match('/views/page/**.{jsp,vm,html}', {
      extras: {
        isPage: true
      }
    }, weight)

    // components目录下标记为模块化
    .match('/components/**', {
      isMod: true
    }, weight)


    // 标记src下的js/es6/jsx
    .match('/src/(**.{js,es6,jsx})', {
      parser: fis.plugin('es6-babel', {
        //去掉严格模式，防止前端内联模版使用with时报错，参考：https://github.com/babel/babel/issues/388
        //blacklist: ["useStrict"]
      }),
      //release: '${statics}/${namespace}/$1',
      isMod: true,
      rExt: '.js'
    }, weight)

    // 对 less 文件默认支持。
    .match('*.less', {
      parser: fis.plugin('less'),
      rExt: '.css',
      useSprite: true
    }, weight)

    // src下的less部署到statics下
    //.match('/src/(**.{svg,tif,tiff,wbmp,png,bmp,fax,gif,ico,jfif,jpe,jpeg,jpg,woff,cur})', {
    //  release: '${statics}/${namespace}/$1'
    //}, weight)

    // 默认使用arttemplate模版
    .match('/src/**.tmpl', {
      parser: fis.plugin('art-tmpl'),
      rExt: '.js'
    }, weight)

    // 对 vm 和 jsp 进行语言识别。
    .match('*.{vm,jsp}', {
      preprocessor: fis.plugin('extlang')
    }, weight)

    .match('{map.json,${namespace}-map.json}', {
      release: '/WEB-INF/config/$0'
    }, weight)

    // 注意这类文件在多个项目中都有的话，会被最后一次 release 的覆盖。
    .match('{fis.properties,server.conf}', {
      release: '/WEB-INF/$0'
    }, weight)

    .match('server.conf', {
      release: '/WEB-INF/server${namespace}.conf'
    }, weight)

    .match('VM_global_library.vm', {
      release: '/${templates}/VM_global_library.vm'
    }, weight)

    // md不产出
    .match('*.md', {
      release: false
    }, weight)

    // _ 下划线打头的都是不希望被产出的文件。
    .match('_*.*', {
      release: false
    }, weight)

    // 脚本也是。
    .match('**.{sh,bat}', {
      release: false
    }, weight)


    // 自动产出 map.json
    .match('::package', {
      postpackager: function(ret) {
        var path = require('path')
        var root = fis.project.getProjectPath();
        var ns = fis.get('namespace');
        var mapFile = ns ? (ns + '-map.json') : 'map.json';
        var map = fis.file.wrap(path.join(root, mapFile));
        map.setContent(JSON.stringify(ret.map, null, map.optimizer ? null : 4));
        ret.pkg[map.subpath] = map;
      }
    }, weight);


  // 在 prod 环境下，开启各种压缩和打包。
  fis
    .media('prod')

    .match('*.{js,jsx,es6}', {
      optimizer: fis.plugin('uglify-js')
    }, weight)

    .match('*.{css,less}', {
      optimizer: fis.plugin('clean-css'),
    }, weight)

    .match('*.png', {
      optimizer: fis.plugin('png-compressor')
    }, weight);

  // 当用户 fis-conf.js 加载后触发。
  fis.on('conf:loaded', function() {
    if (!fis.get('namespace'))return;

    fis.match('/{page,widget}/**.{jsp,vm,html}', {
      url: '/${namespace}$0'
    }, weightWithNs);
  });
};

exports.init = exports;
