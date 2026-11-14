// Garden scenery palettes and materials. Static background painting only.
(function(){'use strict';
const make=(kind,ground,water,sky,path,edge,flowers)=>({kind,ground,water,sky,path,edge,flowers});
PX.GARDEN_LOOKS={
 frontyard:make('meadow',['#78b955','#8fc66b','#5f9f4b','#46783e'],['#b3f2dd','#70d1c4','#3ca7b2','#287d9a'],['#65b9db','#93d7e6','#c7eae4','#fff0ca'],['#fff1d1','#dfbd86','#8d7559'],'#f0d9a9',['#fff1d0','#f0a3b4','#bf9fdd']),
 graveyard:make('moss',['#477e77','#548e81','#386763','#284f55'],['#9ec9e4','#758fc1','#585e9b','#3c386b'],['#211c48','#3a3067','#665083','#a0799c'],['#c8b7df','#8c85ac','#514a72'],'#9188c3',['#c9a6ff','#a6e4ed','#ecdbff']),
 pirate:make('wood',['#b68a58','#c8a16e','#966b45','#674b38'],['#a5f3e2','#51d3cc','#229fb8','#206b98'],['#6bc2e8','#94d9f1','#d0eafa','#fff1ce'],['#ead7a6','#b58c57','#6b4b33'],'#e8cb88',['#f5c56b','#f3a5a1','#f8e5af']),
 egypt:make('mosaic',['#e2bf79','#edd39b','#cc9d59','#a67a42'],['#abebd3','#5dcbad','#2ca28f','#257575'],['#dc9a73','#efbd8f','#f5d7a5','#fff1cc'],['#fff1c6','#d9b568','#8c6637'],'#b49b54',['#ead16c','#73c6ae','#fff0c3']),
 wildwest:make('sand',['#c88d69','#dca785','#b47759','#8d5d48'],['#bed9bc','#86b9ae','#568d96','#416c80'],['#b37d91','#d8a3a0','#eed0b4','#ffe7bd'],['#f1d6ad','#bc8d69','#77543e'],'#d7bd8b',['#e7a3b1','#eabf79','#b8d28c']),
 frostbite:make('snow',['#e1f2f6','#f4fbf8','#bdddea','#8ebdd7'],['#d8fbff','#ade0ed','#75b7d5','#528dbd'],['#8aaad8','#bfd1ec','#e0e5f1','#fff4e1'],['#f8fcff','#b5d7e8','#7599c2'],'#adc9e7',['#c1a9e4','#a5ddeb','#ffffff']),
 bigwave:make('sand',['#edcc94','#f7dfb0','#dcba83','#bd9569'],['#a9f3df','#64d9d1','#35b0c6','#287fac'],['#72c4e6','#a4e1ed','#d8eeeb','#fff2ce'],['#f9e9c5','#cba982','#90775b'],'#f3e2b3',['#edb0aa','#e8cf86','#f9f0cd']),
 lostcity:make('ruins',['#5b9272','#78aa83','#437455','#345b48'],['#c1dfad','#87bca3','#528f8d','#3c6b79'],['#88bda5','#b7d0b1','#e1deb7','#f9e8bf'],['#e5d59c','#b4a565','#766f43'],'#cdb879',['#e6b862','#e8d69b','#f2ddb2']),
 jurassic:make('jungle',['#397455','#4e8960','#2e6149','#214e3e'],['#a1cba8','#76ae95','#4d887e','#386465'],['#619b8d','#8abb9d','#c1d4ad','#e3dfb7'],['#d6ca9f','#9e9470','#655e4e'],'#9dbe83',['#e5af87','#c5d79b','#dfcc9f']),
 farfuture:make('circuit',['#243c55','#304c65','#183148','#12263c'],['#a3edeb','#69c8d6','#4396b5','#2c647f'],['#242b55','#384a70','#627591','#9ea7ba'],['#b5e8e4','#719fae','#3b5b77'],'#68c9d8',['#9bdedb','#b2a3df','#e8d2a4']),
 darkages:make('stone',['#82928c','#9aaba0','#687b78','#4e6366'],['#b5d7cc','#84b8b2','#568d99','#3e687d'],['#394361','#5e6580','#8e8b9b','#bca7ac'],['#ddd4bd','#ada18a','#746e66'],'#ac9f7e',['#caa1c3','#e1c58d','#b4d5ba']),
 neon:make('dance',['#443859','#584368','#322d4a','#24283f'],['#c3b3e7','#9c83cf','#735fac','#4d4787'],['#292a54','#4d3a6b','#87527f','#cb819c'],['#e6bbdf','#b484b7','#715879'],'#c4a0d7',['#e6aacb','#88d3d2','#e8d58e']),
 poolside:make('pool',['#aed3ba','#cae1c6','#8fbaa3','#70a18f'],['#d5fcf1','#9fe5dd','#6dc8d0','#4b9dbd'],['#8acbe9','#b2e1ee','#ddecdf','#fff1ce'],['#fff5dc','#d8d2b9','#9caa9b'],'#f0dfbc',['#edaeb9','#efe0ac','#b1d5c6']),
 foggynight:make('moss',['#487d75','#5b9385','#38665f','#29514f'],['#c3d7dc','#9bb9ca','#7093b2','#4c6a90'],['#3c4166','#62617f','#9590a5','#c3b1b5'],['#d9d1d9','#a5a0b8','#686b8a'],'#aca8cf',['#d8c2ed','#b3e6df','#f2e6cf']),
 rooftop:make('roof',['#c57c68','#dfa08a','#a65f53','#80473f'],['#cbf0e9','#9bd9da','#71b9ce','#518cae'],['#7ba9d6','#accee5','#d9e4e8','#fff0d4'],['#f0d5ba','#c5a18b','#8f7069'],'#dfc3a4',['#dfb1c4','#f4d5a0','#c3d6a1']),
 candyland:make('candy',['#eebed2','#f7d9e1','#dca8c5','#bb8bab'],['#fff0b7','#f1d87f','#d4b66a','#ad9868'],['#b69cce','#d7bddf','#f0d6e4','#fff0db'],['#fff2dc','#e7c0bd','#bf919e'],'#f5ded1',['#efb2ce','#c3b5e8','#b4dccb'])
};
})();
