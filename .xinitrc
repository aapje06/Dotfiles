#!/bin/sh

userresources=$HOME/.Xresources
usermodmap=$HOME/.Xmodmap
sysresources=/etc/X11/xinit/.Xresources
sysmodmap=/etc/X11/xinit/.Xmodmap

# merge in defaults and keymaps

if [ -f $sysresources ]; then
    xrdb -merge $sysresources
fi

if [ -f $sysmodmap ]; then
    xmodmap $sysmodmap
fi

if [ -f "$userresources" ]; then
    xrdb -merge "$userresources"
fi

if [ -f "$usermodmap" ]; then
    xmodmap "$usermodmap"
fi

# start some nice programs

if [ -d /etc/X11/xinit/xinitrc.d ] ; then
 for f in /etc/X11/xinit/xinitrc.d/?*.sh ; do
  [ -x "$f" ] && . "$f"
 done
 unset f
fi


for var in $(ls /mnt/oldinst/usr/share/fonts/)
do
	xset +fp /usr/share/fonts/$var
done


#xset +fp /usr/share/fonts/100dpi
#xset +fp /usr/share/fonts/75dpi
#xset +fp /usr/share/fonts/artwiz-fonts
#xset +fp /usr/share/fonts/cantarell
#xset +fp /usr/share/fonts/cyrillic
#xset +fp /usr/share/fonts/encodings
#xset +fp /usr/share/fonts/local
#xset +fp /usr/share/fonts/misc
#xset +fp /usr/share/fonts/noto
#xset +fp /usr/share/fonts/OTF
#xset +fp /usr/share/fonts/TTF
#xset +fp /usr/share/fonts/util

export QT_QPA_PLATFORMTHEME=gtk2
export _JAVA_OPTIONS='-Dawt.useSystemAAFontSettings=on -Dswing.aatext=true -Dswing.defaultlaf=com.sun.java.swing.plaf.gtk.GTKLookAndFeel'
export _JAVA_AWT_WM_NONREPARENTING=1

xset -b &

xsetroot -cursor_name left_ptr
sxhkd &
exec bspwm


#twm &
#xclock -geometry 50x50-1+1 &
#xterm -geometry 80x50+494+51 &
#xterm -geometry 80x20+494-0 &
#exec xterm -geometry 80x66+0+0 -name login
