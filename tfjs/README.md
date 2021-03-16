(schtasks should run with administrator privilege)

TFJS  daily:
schtasks /create /xml "C:\workspace\tfjsDaily.xml" /tn TFJSDaily

Delete:
schtasks /delete /tn TFJSDaily /f   

TFJS yarn test:
schtasks /create /xml "C:\workspace\dailyscript\tfjsyarn1Daily.xml" /tn TFJSYarn1Daily
schtasks /create /xml "C:\workspace\dailyscript\tfjsyarn2Daily.xml" /tn TFJSYarn2Daily

schtasks /delete /tn TFJSYarn1Daily /f
schtasks /delete /tn TFJSYarn2Daily /f   