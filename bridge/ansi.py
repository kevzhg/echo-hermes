"""Strip ANSI escape codes from terminal output."""

import re

_ANSI_CSI = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]')
_ANSI_OSC = re.compile(r'\x1b\][^\x07]*\x07')
_ANSI_MISC = re.compile(r'\x1b[^[\]][^a-zA-Z]*[a-zA-Z]')


def strip_ansi(text: str) -> str:
    text = _ANSI_CSI.sub('', text)
    text = _ANSI_OSC.sub('', text)
    text = _ANSI_MISC.sub('', text)
    # Strip carriage returns (Hermes outputs \r\n on some lines)
    text = text.replace('\r', '')
    return text
