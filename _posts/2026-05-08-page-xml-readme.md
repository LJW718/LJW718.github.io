---
layout: post
title:  page xml readme
date:   2026-05-08 12:08:00 +0800
categories: README
typora-root-url: ..

---
* content
{:toc}

# XML注释说明

## 页面组件-page

```xml
<page 
  menu_lang_enable="1:使能菜单键切换语言 0:不使能"
  display_time="在bridge delay多久 32位数据"
  common_info_enable="填写对应的common_info_line页面中的元素keyvalue，多个keyvalue间以英文逗号隔开，功能包括使能左上角点击显示qr和版本号、vendor logo、机器号、multilang、ultra mode、bt、wifi；使能只是允许显示该元素，但最终是否显示，显示什么，是由keyvalue的回调决定的"
  theme_page="当前主题 0:default，1:dark"
/>
```

## 线组件-line

```xml
<line point_num="点数量">
  <color_info 
    line_color="线的颜色000000~ffffff" 
    line_coord="线的宽度 16位数据"
  />
  <pos_info 
    align="当前线对于父对象的对齐方式 参考lv_align_t"
    x_ofs="当前线基于对齐方式对于父对象的x偏移量 16位数据"
    y_ofs="当前线基于对齐方式对于父对象的y偏移量 16位数据"
  />
  <!-- 根据点数量确定多个point -->
  <point 
    x="当前线对于父对象的x坐标 16位数据" 
    y="当前线对于父对象的x坐标 16位数据"
  />
</line>
```

## 按钮组件-btn

```xml
<btn element_name="当前组件名字" key_value="32位的数据">
  <bg_info 
    bg_opa="透明度 0~255" 
    bg_color="背景色000000~ffffff" 
    border_color="边界色000000~ffffff" 
    border_width="边界宽度 32位数据" 
    outline_width="边框宽度 32位数据" 
    outline_color="边框色000000~ffffff" 
    grad_enable="渐变色使能 0：不使能 1：使能" 
    grad_color="渐变颜色000000~ffffff" 
    grad_dir="设置渐变方向 0：没有梯度 1：垂直方向 2：水平方向" 
    main_stop_value="设置渐变开始位置 0~255" 
    grad_stop_value="设置渐变结束位置 0~255"
    theme_bg="设置主题,如果设备处于该模式就会显示该模式的背景颜色 0:default，1:dark"
  />
  <rect 
    x="x坐标 32位数据" 
    y="y坐标 32位数据"
    width="当前btn宽度 32位数据" 
    height="当前btn高度 32位数据" 
    round_angle="当前btn的圆角弧度 0~0x7FFF 参考lvgl 宏定义LV_RADIUS_CIRCLE" 
    align="当前btn对于父对象的对齐方式 参考lv_align_t"
  />
  <pad 
    pad_top="子对象和边界的顶部间距 16位数据" 
    pad_bottom="子对象和边界的底部间距 16位数据" 
    pad_left="子对象离边界的左边间距 16位数据" 
    pad_right="子对象离边界的右边间距 16位数据" 
    pad_row="子对象之间的列间距 16位数据" 
    pad_column="子对象之间的行间距 16位数据"
  />
  <flow_info 
    flow="设置子对象弹性布局 参考结构体gui_serv_flex_flow_t" 
    cross_place="弹性布局对齐方式 确定如何在主轴上的轨道上分配组件 参考gui_serv_flex_align_t" 
    main_place="弹性布局对齐方式 确定如何在主轴上的轨道上分配组件 参考gui_serv_flex_align_t" 
    track_place="弹性布局对齐方式 确定如何分配轨道 参考gui_serv_flex_align_t"
  />
  <child_btn style_num="孩子组件可选择样式的数量 并不等于孩子数量">
    <btn elename="孩子样式名称1">
      <!-- 中间内容与btn相同 -->
    </btn>
    <btn elename="孩子样式2">
      <!-- 中间内容与btn相同 -->
    </btn>
  </child_btn>
  <line_group line_num="线数量">
    <line><!-- 参考线组件，可以有多个line --></line>
  </line_group>
  <trans_style>
    <state state="16位数据 用过渡样式的状态 参考lv_state_t 目前仅使用了LV_STATE_FOCUSED" />
    <bg_info /><!-- 参考组件btn的bg_info -->
    <offset y_ofs="过渡样式按键效果向下的偏移 16位数据" />
  </trans_style>
  <label_group label_num="有几个label_info">
    <label_info  
      string="显示的字符串 拥有eid这个字符串就不生效"
      eID="多语言eid数据"
      font_color="字体颜色000000~ffffff"
      font_size="字体大小 10~72"
      width="当前label宽度 16位数据"
      height="当前label高度 16位数据"
      x_ofs="当前文本相对于父对象的x轴偏移 16位数据" 
      y_ofs="当前文本相对于父对象的y轴偏移 16位数据" 
      align="label元素相对于父对象的对齐方式 一般使用9表示居中 参考lv_align_t 8位" 
      enable_bold_font="字体使能粗体 1为粗体" 
      text_align="文本对齐方式 参考lv_text_align_t 8位" 
      choose_font_color="label组件在选中状态下的字体颜色 结合过渡样式使用 000000~ffffff" 
      label_long_mode="长文本模式 参考lv_label_long_mode_t"
      font_type="字体类型 对应不同的字体文件 参考 1:icon 2:roboto 3:orbitron 4:bebas"
      font_style="字体样式 常用就俩 0:常规 2:freetype加粗,需要描边时这个值必须为2"
      stroke_radius="描边宽度 一般两层描边 此参数为最外圈描边宽度 内层描边宽度在gui库中是固定值"
      stroke_color="描边颜色  两层描边都使用这个颜色" 
      stroke_opa="描边透明度 这个值为最外层描边透明度  内层透明度在gui库中是固定值255" 
      letter_space="字符间距 描边可能导致字符相互粘连遮挡 可适当扩大此值"
    />
  </label_group>
  <label_dark 
    font_color="字体颜色000000~ffffff"
    letter_space="字符间距 描边可能导致字符相互粘连遮挡 可适当扩大此值"
    font_style="字体样式 常用就俩 0:常规 2:freetype加粗,需要描边时这个值必须为2"
  />
  <img 
    path="图片路径"
    angle="图片旋转角度"
    x_ofs="图片x偏移 >0向右偏移 <0向左偏移"
    y_ofs="图片y偏移 >0向下偏移 <0向上偏移"
    theme_img="增加图片后缀，如果是设备处于当前主题的时候，就会自动寻找当前主题的照片，
               0:default，1:dark eg: 1.png-> 设备处于dark模式 1_dark.png"
  />
  <qrcode qr_length="二维码大小" />
</btn>
```

## 布局组件-layout

```xml
<layout 
  element_name="组件名称" 
  scroll_enable="使能滑块滚动 0表示简单的容器 1表示该组件可以滚动" 
  key_value="组件标识符32位">
  <btn element_name="">
    <!-- 参考btn组件内容 -->
    <child_btn style_num="孩子组件可选择样式的数量 并不等于孩子数量">
      <btn elename="孩子样式1">
        <!-- 中间内容与btn相同 -->
      </btn>
      <btn elename="孩子样式2">
        <!-- 中间内容与btn相同 -->
      </btn>
    </child_btn>
  </btn>
</layout>
```

