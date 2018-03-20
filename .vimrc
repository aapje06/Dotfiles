set enc=utf-8
scriptencoding utf-8
set number
set relativenumber
set backspace=indent,eol,start
set scrolloff=15
"colorscheme office-dark
highlight Normal ctermbg=None
highlight LineNr ctermbg=None
"filetype plugin on
syntax on

" filetype plugin off
" filetype indent on

" ============== VUNDLE =================
set nocompatible              " be iMproved, required
filetype off                  " required

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()
" alternatively, pass a path where Vundle should install plugins
"call vundle#begin('~/some/path/here')

" let Vundle manage Vundle, required
Plugin 'VundleVim/Vundle.vim'

" extra plugins
Plugin 'scrooloose/nerdtree'
Plugin 'Valloric/YouCompleteMe'


" All of your Plugins must be added before the following line
call vundle#end()            " required
filetype plugin indent on    " required

" ============== VUNDLE =================


"filetype plugin indent on
" show existing tab with 4 spaces width
set tabstop=4
" when indenting with '>', use 4 spaces width
set shiftwidth=4
" On pressing tab, insert 4 spaces
set expandtab




"""LATEX"""
"autocmd FileType tex inoremap <F5> <Esc>:w<Enter>:!xelatex<spacE><c-r>%&&pdftex<spacE><c-r>%&&<xelatex<spacE><c-r>%<Enter>
"autocmd FileType tex nnoremap <F5> :w<Enter>:!xelatex<spacE><c-r>%&&pdftex<spacE><c-r>%&&<xelatex<spacE><c-r>%<Enter><Enter>
"autocmd FileType tex inoremap <F5> <Esc>:w<Enter>:!xelatex % && pdftex % && xelatex % && xelatex %<Enter>
autocmd FileType tex vnoremap ;k !boxes -d latex -s 50 -a c<CR>
autocmd FileType tex nnoremap ;k !!boxes -d latex -s 50 -a c<CR>
autocmd FileType tex vnoremap ;ku !boxes -d latex -r<CR>
autocmd FileType tex nnoremap ;ku !!boxes -d latex -r<CR>
autocmd FileType tex nnoremap <F5> :w<Enter>:!/home/pieter-jan/.scripts/compileLatex %<Enter><Enter>
autocmd FileType tex inoremap <F5> <Esc>:w<Enter>:!/home/pieter-jan/.scripts/compileLatex %<Enter>i
autocmd FileType tex inoremap <F4> <Esc>:!zathura <C-r>% <Backspace><Backspace><Backspace><Backspace>pdf&<Enter>i
autocmd FileType tex nnoremap <F4> :!zathura <C-r>% <Backspace><Backspace><Backspace><Backspace>pdf&<Enter>

map <F6> :setlocal spell! spelllang=en_us<CR>


"""PYTHON"""

autocmd FileType python inoremap <F5> <Esc>:w<Enter>:!clear;python<spacE>%<Enter>
autocmd FileType python nnoremap <F5> :w<Enter>:!clear;python<spacE>%<Enter>

let g:office_dark_LineNr = 'off'
let g:office_light_LineNr = 'off'
