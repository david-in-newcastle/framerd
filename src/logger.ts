import * as vscode from 'vscode';

export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}

class Logger {
    private level: LogLevel;
    private outputChannel?: vscode.OutputChannel;
    
    constructor() {
        const envLevel = process.env.FRAMERD_LOG_LEVEL?.toUpperCase();
        switch (envLevel) {
            case 'ERROR': this.level = LogLevel.ERROR; break;
            case 'WARN': this.level = LogLevel.WARN; break;
            case 'INFO': this.level = LogLevel.INFO; break;
            case 'DEBUG': this.level = LogLevel.DEBUG; break;
            default: this.level = LogLevel.DEBUG; // Changed to DEBUG by default
        }
    }
    
    setOutputChannel(channel: vscode.OutputChannel) {
        this.outputChannel = channel;
    }
    
    debug(...args: any[]) {
        if (this.level >= LogLevel.DEBUG) {
            const msg = '[DEBUG] ' + args.join(' ');
            console.log(msg);
            this.outputChannel?.appendLine(msg);
        }
    }
    
    info(...args: any[]) {
        if (this.level >= LogLevel.INFO) {
            const msg = '[INFO] ' + args.join(' ');
            console.log(msg);
            this.outputChannel?.appendLine(msg);
        }
    }
    
    warn(...args: any[]) {
        if (this.level >= LogLevel.WARN) {
            const msg = '[WARN] ' + args.join(' ');
            console.warn(msg);
            this.outputChannel?.appendLine(msg);
        }
    }
    
    error(...args: any[]) {
        if (this.level >= LogLevel.ERROR) {
            const msg = '[ERROR] ' + args.join(' ');
            console.error(msg);
            this.outputChannel?.appendLine(msg);
        }
    }
}

export const logger = new Logger();