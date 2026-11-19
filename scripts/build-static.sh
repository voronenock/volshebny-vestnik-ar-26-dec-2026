#!/bin/sh
set -eu
cat media_parts/ozhivshaya_gazeta.mp4.part01 media_parts/ozhivshaya_gazeta.mp4.part02 media_parts/ozhivshaya_gazeta.mp4.part03 media_parts/ozhivshaya_gazeta.mp4.part04 > site/ozhivshaya_gazeta.mp4
sha256sum -c media_parts/video.sha256
