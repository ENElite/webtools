import { useState, useCallback } from 'react';
import {
    jsonKeyStyle,
    jsonStringStyle,
    jsonNumberStyle,
    jsonBooleanStyle,
    jsonNullStyle,
    jsonBracketStyle,
    jsonToggleStyle,
} from './styles';

type JsonViewerProps = {
    data: unknown;
    name?: string;
    defaultExpanded?: boolean;
    depth?: number;
};

const MAX_DEPTH = 6;

export function JsonViewer({ data, name, defaultExpanded, depth = 0 }: JsonViewerProps) {
    const [expanded, setExpanded] = useState(() => {
        if (defaultExpanded !== undefined) return defaultExpanded;
        return depth < 2;
    });

    const toggle = useCallback(() => setExpanded((e) => !e), []);

    if (data === null) {
        return (
            <span>
                {name && <span style={jsonKeyStyle}>{name}: </span>}
                <span style={jsonNullStyle}>null</span>
            </span>
        );
    }

    if (data === undefined) {
        return (
            <span>
                {name && <span style={jsonKeyStyle}>{name}: </span>}
                <span style={jsonNullStyle}>undefined</span>
            </span>
        );
    }

    if (typeof data === 'boolean') {
        return (
            <span>
                {name && <span style={jsonKeyStyle}>{name}: </span>}
                <span style={jsonBooleanStyle}>{String(data)}</span>
            </span>
        );
    }

    if (typeof data === 'number') {
        return (
            <span>
                {name && <span style={jsonKeyStyle}>{name}: </span>}
                <span style={jsonNumberStyle}>{data}</span>
            </span>
        );
    }

    if (typeof data === 'string') {
        const display = data.length > 120 ? data.slice(0, 120) + '...' : data;
        return (
            <span>
                {name && <span style={jsonKeyStyle}>{name}: </span>}
                <span style={jsonStringStyle}>"{display}"</span>
            </span>
        );
    }

    if (Array.isArray(data)) {
        if (data.length === 0) {
            return (
                <span>
                    {name && <span style={jsonKeyStyle}>{name}: </span>}
                    <span style={jsonBracketStyle}>[]</span>
                </span>
            );
        }

        if (!expanded) {
            return (
                <span>
                    {name && <span style={jsonKeyStyle}>{name}: </span>}
                    <span style={jsonToggleStyle} onClick={toggle}>▶</span>
                    <span style={jsonBracketStyle}>[{data.length} items]</span>
                </span>
            );
        }

        if (depth >= MAX_DEPTH) {
            return (
                <span>
                    {name && <span style={jsonKeyStyle}>{name}: </span>}
                    <span style={jsonBracketStyle}>[...]</span>
                </span>
            );
        }

        return (
            <div style={{ paddingLeft: name ? 0 : 12 }}>
                <div>
                    {name && <span style={jsonKeyStyle}>{name}: </span>}
                    <span style={jsonToggleStyle} onClick={toggle}>▼</span>
                    <span style={jsonBracketStyle}>[</span>
                </div>
                {data.map((item, i) => (
                    <div key={i} style={{ paddingLeft: 16 }}>
                        <JsonViewer data={item} depth={depth + 1} defaultExpanded={false} />
                        {i < data.length - 1 && <span style={{ color: '#555' }}>,</span>}
                    </div>
                ))}
                <div style={jsonBracketStyle}>]</div>
            </div>
        );
    }

    if (typeof data === 'object') {
        const keys = Object.keys(data as Record<string, unknown>);
        if (keys.length === 0) {
            return (
                <span>
                    {name && <span style={jsonKeyStyle}>{name}: </span>}
                    <span style={jsonBracketStyle}>{'{}'}</span>
                </span>
            );
        }

        if (!expanded) {
            return (
                <span>
                    {name && <span style={jsonKeyStyle}>{name}: </span>}
                    <span style={jsonToggleStyle} onClick={toggle}>▶</span>
                    <span style={jsonBracketStyle}>{'{' + keys.length + ' keys'}</span>
                    <span style={jsonBracketStyle}>{'}'}</span>
                </span>
            );
        }

        if (depth >= MAX_DEPTH) {
            return (
                <span>
                    {name && <span style={jsonKeyStyle}>{name}: </span>}
                    <span style={jsonBracketStyle}>{'{...}'}</span>
                </span>
            );
        }

        const obj = data as Record<string, unknown>;
        return (
            <div style={{ paddingLeft: name ? 0 : 12 }}>
                <div>
                    {name && <span style={jsonKeyStyle}>{name}: </span>}
                    <span style={jsonToggleStyle} onClick={toggle}>▼</span>
                    <span style={jsonBracketStyle}>{'{'}</span>
                </div>
                {keys.map((key, i) => (
                    <div key={key} style={{ paddingLeft: 16 }}>
                        <JsonViewer data={obj[key]} name={key} depth={depth + 1} defaultExpanded={depth < 1} />
                        {i < keys.length - 1 && <span style={{ color: '#555' }}>,</span>}
                    </div>
                ))}
                <div style={jsonBracketStyle}>{'}'}</div>
            </div>
        );
    }

    return (
        <span>
            {name && <span style={jsonKeyStyle}>{name}: </span>}
            <span>{String(data)}</span>
        </span>
    );
}
