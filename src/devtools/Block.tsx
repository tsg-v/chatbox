import { useEffect, useState, useRef ,useMemo } from 'react';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from './openai-node';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import { Button, Divider, ListItem, Typography, Grid, TextField, Menu, MenuProps } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import hljs from 'highlight.js'
import 'katex/dist/katex.min.css'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import { styled, alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import * as wordCount from './utils'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import 'github-markdown-css/github-markdown-light.css'
import mila from 'markdown-it-link-attributes'

const md = new MarkdownIt({
    linkify: true,
    breaks: true,
    highlight: (str: string, lang: string, attrs: string): string => {
        let content = str
        if (lang && hljs.getLanguage(lang)) {
            try {
                content = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
            } catch (e) {
                console.log(e)
                return str
            }
        } else {
            content = md.utils.escapeHtml(str)
        }
        return `<pre class="hljs" style="max-width: 50vw; overflow: auto"><code>${content}</code></pre>`;
    }
});
md.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })
md.use(mila, { attrs: { target: "_blank", rel: "noopener" } })

export type Message = ChatCompletionRequestMessage & {
    id: string
}

export interface Props {
    id?: string
    msg: Message
    showWordCount: boolean
    showTokenCount: boolean
    setMsg: (msg: Message) => void
    delMsg: () => void
    refreshMsg: () => void
    copyMsg: () => void
    quoteMsg: () => void
}

function _Block(props: Props) {
    const { msg, setMsg } = props
    const [isHovering, setIsHovering] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const messageRef = useRef<HTMLDivElement>(null)

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    // Detect and enhance code blocks after markdown rendering
    useEffect(() => {
        if (!messageRef.current || isEditing) return;

        // Use setTimeout to ensure dangerouslySetInnerHTML has rendered
        const timer = setTimeout(() => {
            const codeBlocks = messageRef.current?.querySelectorAll('pre.hljs');
            if (!codeBlocks || codeBlocks.length === 0) return;

            codeBlocks.forEach((block) => {
                const codeElement = block.querySelector('code');
                if (!codeElement) return;

                // Extract clean text content
                const codeText = codeElement.textContent || '';

                // Check if already wrapped
                const existingWrapper = (block.parentElement as HTMLElement);
                if (existingWrapper?.classList.contains('code-block-wrapper')) {
                    return; // Already wrapped, CSS handles theme changes
                }

                // Create wrapper div
                const wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';

                // Create copy button
                const copyButton = document.createElement('button');
                copyButton.className = 'code-copy-button';
                copyButton.setAttribute('aria-label', 'Copy code to clipboard');
                copyButton.title = 'Copy code';
                copyButton.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                `;

                // Copy functionality
                copyButton.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(codeText);
                        // Success feedback
                        copyButton.classList.add('copied');
                        copyButton.innerHTML = `
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                        `;
                        copyButton.setAttribute('aria-label', 'Code copied!');
                        
                        setTimeout(() => {
                            copyButton.classList.remove('copied');
                            copyButton.innerHTML = `
                                <svg viewBox="0 0 24 24">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                            `;
                            copyButton.setAttribute('aria-label', 'Copy code to clipboard');
                        }, 2000);
                    } catch (err) {
                        // Error feedback
                        copyButton.classList.add('error');
                        copyButton.setAttribute('aria-label', 'Failed to copy');
                        setTimeout(() => {
                            copyButton.classList.remove('error');
                            copyButton.setAttribute('aria-label', 'Copy code to clipboard');
                        }, 2000);
                    }
                });

                // Wrap the code block
                block.parentNode?.insertBefore(wrapper, block);
                wrapper.appendChild(block);
                wrapper.appendChild(copyButton);
            });
        }, 0);
        
        return () => clearTimeout(timer);
    }, [msg.content, isEditing]);

    const tips: string[] = []
    if (props.showWordCount) {
        tips.push(`word count: ${wordCount.countWord(msg.content)}`)
    }
    if (props.showTokenCount) {
        tips.push(`token estimate: ${wordCount.estimateTokens(msg.content)}`)
    }
    return (
        <ListItem
            id={props.id}
            key={msg.id}
            onMouseEnter={() => {
                setIsHovering(true)
            }}
            onMouseOver={() => {
                setIsHovering(true)
            }}
            onMouseLeave={() => {
                setIsHovering(false)
            }}
            sx={{
                padding: '22px 28px',
            }}
        >
            <Grid container spacing={2}>
                <Grid item>
                    {
                        isEditing ? (
                            <Select
                                value={msg.role}
                                onChange={(e: SelectChangeEvent) => {
                                    setMsg && setMsg({ ...msg, role: e.target.value as ChatCompletionRequestMessageRoleEnum })
                                }}
                                size='small'
                                id={msg.id + 'select'}
                            >
                                <MenuItem value={ChatCompletionRequestMessageRoleEnum.System}>
                                    <Avatar ><SettingsIcon /></Avatar>
                                </MenuItem>
                                <MenuItem value={ChatCompletionRequestMessageRoleEnum.User}>
                                    <Avatar><PersonIcon /></Avatar>
                                </MenuItem>
                                <MenuItem value={ChatCompletionRequestMessageRoleEnum.Assistant}>
                                    <Avatar><SmartToyIcon /></Avatar>
                                </MenuItem>
                            </Select>
                        ) : (
                            {
                                assistant: <Avatar><SmartToyIcon /></Avatar>,
                                user: <Avatar><PersonIcon /></Avatar>,
                                system: <Avatar><SettingsIcon /></Avatar>
                            }[msg.role]
                        )
                    }
                </Grid>
                <Grid item xs={11} sm container>
                    <Grid item xs container direction="column" spacing={2}>
                        <Grid item xs>
                            <Typography variant="overline" component="div">
                                {msg.role}
                            </Typography>
                            {
                                isEditing ? (
                                    <TextField
                                        style={{
                                            width: "100%",
                                        }}
                                        multiline
                                        placeholder="prompt"
                                        value={msg.content}
                                        onChange={(e) => { setMsg && setMsg({ ...msg, content: e.target.value }) }}
                                        id={msg.id + 'input'}
                                    />
                                ) : (
                                    <Box
                                        ref={messageRef}
                                        sx={{
                                            // bgcolor: "Background",
                                        }}
                                        dangerouslySetInnerHTML={{ __html: md.render(msg.content) }}
                                    />
                                )
                            }
                            <Typography variant="body2" color="GrayText" sx={{opacity: 0.5}} >
                                {
                                    tips.join(', ')
                                }
                            </Typography>
                        </Grid>
                    </Grid>
                    <Grid item xs={1}>
                        {
                            isEditing ? (
                                <>
                                <Button onClick={() => setIsEditing(false)}>
                                    <CheckIcon fontSize='small' />
                                </Button>
                                </>
                            ) : (
                                isHovering && (
                                    <>
                                        <Button onClick={() => props.refreshMsg()}>
                                            <RefreshIcon fontSize='small' />
                                        </Button>
                                        <Button onClick={handleClick}>
                                            <MoreVertIcon />
                                        </Button>
                                        <StyledMenu
                                            MenuListProps={{
                                                'aria-labelledby': 'demo-customized-button',
                                            }}
                                            anchorEl={anchorEl}
                                            open={open}
                                            onClose={handleClose}
                                            key={msg.id + 'menu'}
                                        >
                                            <MenuItem key={msg.id + 'copy'} onClick={() => {
                                                props.copyMsg()
                                                setAnchorEl(null)
                                            }} disableRipple>
                                                <ContentCopyIcon />
                                                Copy
                                            </MenuItem>

                                            <MenuItem key={msg.id + 'edit'} onClick={() => {
                                                setIsHovering(false)
                                                setAnchorEl(null)
                                                setIsEditing(true)
                                            }} disableRipple>
                                                <EditIcon />
                                                Edit
                                            </MenuItem>
                                            <MenuItem key={msg.id + 'quote'} onClick={() => {
                                                setIsHovering(false)
                                                setAnchorEl(null)
                                                props.quoteMsg()
                                            }} disableRipple>
                                                <FormatQuoteIcon />
                                                Quote
                                            </MenuItem>
                                            <Divider sx={{ my: 0.5 }} />
                                            <MenuItem key={msg.id + 'del'} onClick={() => {
                                                setIsEditing(false)
                                                setIsHovering(false)
                                                setAnchorEl(null)
                                                props.delMsg()
                                            }} disableRipple
                                            >
                                                <DeleteForeverIcon />
                                                Delete
                                            </MenuItem>
                                        </StyledMenu>
                                    </>)
                            )
                        }
                    </Grid>
                </Grid>
            </Grid>
        </ListItem>
    );
}

// <Divider variant="middle" light />
const StyledMenu = styled((props: MenuProps) => (
    <Menu
        elevation={0}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
        }}
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: theme.spacing(1),
        minWidth: 140,
        color:
            theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': {
            padding: '4px 0',
        },
        '& .MuiMenuItem-root': {
            '& .MuiSvgIcon-root': {
                fontSize: 18,
                color: theme.palette.text.secondary,
                marginRight: theme.spacing(1.5),
            },
            '&:active': {
                backgroundColor: alpha(
                    theme.palette.primary.main,
                    theme.palette.action.selectedOpacity,
                ),
            },
        },
    },
}));

export default function Block(props: Props) {
    return useMemo(() => {
        return <_Block {...props} />
    }, [props.msg, props.showWordCount, props.showTokenCount])
}
